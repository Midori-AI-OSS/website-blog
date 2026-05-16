import { normalizeChannel, normalizeQuality } from './contract';
import type { QualityName } from './contract';

type BroadcasterKey = `${string}:${string}`;

interface Subscriber {
  write(chunk: Uint8Array): void;
  close(): void;
}

const UPSTREAM_BASE = 'https://radio.midori-ai.xyz';
const ESTIMATED_BITRATE_BPS: Record<string, number> = { low: 96000, medium: 160000, high: 320000 };
const MIN_RECONNECT_DELAY_MS = 60_000;
const MAX_RECONNECT_DELAY_MS = 600_000;
const IDLE_CLEANUP_MS = 30_000;
const WATCHDOG_INTERVAL_MS = 15_000;
const WATCHDOG_STALL_MS = 45_000;
const RECONNECT_SUPPRESS_AFTER_STOP_MS = 1500;

class RadioBroadcaster {
  private static instances = new Map<BroadcasterKey, RadioBroadcaster>();

  static getInstance(channel: string, quality: QualityName): RadioBroadcaster {
    const key: BroadcasterKey = `${normalizeChannel(channel)}:${normalizeQuality(quality)}`;
    let instance = this.instances.get(key);
    if (!instance) {
      instance = new RadioBroadcaster(normalizeChannel(channel), normalizeQuality(quality));
      this.instances.set(key, instance);
    }
    return instance;
  }

  private subscribers = new Set<Subscriber>();
  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private reconnectGeneration = 0;
  private active = false;
  private lastByteTime = 0;
  private suppressReconnectUntil = 0;
  private totalBytesLastBurst = 0;

  private constructor(
    private channel: string,
    private quality: QualityName,
  ) {}

  subscribe(): ReadableStream<Uint8Array> {
    this.clearIdleTimer();

    const sub: Subscriber = {
      write: () => {},
      close: () => {},
    };

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        sub.write = (chunk) => {
          controller.enqueue(chunk);
        };
        sub.close = () => {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        };
        this.subscribers.add(sub);
        if (!this.active) {
          this.start();
        }
      },
      cancel: () => {
        this.subscribers.delete(sub);
        if (this.subscribers.size === 0) {
          this.scheduleIdleCleanup();
        }
      },
    });

    return stream;
  }

  stop() {
    this.reconnectGeneration++;
    this.active = false;
    this.reconnectAttempt = 0;
    this.abortUpstream();
    this.clearReconnectTimer();
    this.clearWatchdog();
    this.clearIdleTimer();
    this.suppressReconnectUntil = Date.now() + RECONNECT_SUPPRESS_AFTER_STOP_MS;
    this.totalBytesLastBurst = 0;

    for (const sub of this.subscribers) {
      sub.close();
    }
    this.subscribers.clear();
  }

  updateChannel(newChannel: string) {
    const normalized = normalizeChannel(newChannel);
    if (normalized === this.channel) return;
    this.channel = normalized;
    this.stop();
  }

  updateQuality(newQuality: QualityName) {
    const normalized = normalizeQuality(newQuality);
    if (normalized === this.quality) return;
    this.quality = normalized;
    this.stop();
  }

  get subscriberCount(): number {
    return this.subscribers.size;
  }

  private start() {
    if (this.active) return;
    this.active = true;
    this.reconnectAttempt = 0;
    this.reconnectGeneration++;
    this.lastByteTime = Date.now();
    this.totalBytesLastBurst = 0;
    this.connectUpstream(this.reconnectGeneration);
  }

  private abortUpstream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearWatchdog() {
    if (this.watchdogTimer !== null) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private clearIdleTimer() {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private scheduleIdleCleanup() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (this.subscribers.size === 0) {
        this.reconnectGeneration++;
        this.active = false;
        this.abortUpstream();
        this.clearReconnectTimer();
        this.clearWatchdog();
      }
    }, IDLE_CLEANUP_MS);
  }

  private scheduleReconnect(generation: number) {
    if (generation !== this.reconnectGeneration) return;
    if (!this.active) return;

    this.clearReconnectTimer();

    const delay = this.getReconnectDelay();
    console.log(`[radio] RECONNECT gen=${generation} attempt=${this.reconnectAttempt} delay=${(delay / 1000).toFixed(0)}s subs=${this.subscribers.size} lastBurst=${(this.totalBytesLastBurst / 1024).toFixed(0)}KB`);
    this.reconnectTimer = setTimeout(() => {
      if (generation !== this.reconnectGeneration) return;
      if (!this.active) return;
      if (Date.now() < this.suppressReconnectUntil) return;
      this.reconnectAttempt++;
      this.connectUpstream(generation).catch(() => {});
    }, delay);
  }

  private getReconnectDelay(): number {
    if (this.totalBytesLastBurst > 0) {
      const bitrate = ESTIMATED_BITRATE_BPS[this.quality] ?? 160000;
      const playbackMs = (this.totalBytesLastBurst * 8 / bitrate) * 1000;
      return Math.max(MIN_RECONNECT_DELAY_MS, Math.min(MAX_RECONNECT_DELAY_MS, Math.round(playbackMs)));
    }
    const shortDelays = [2000, 4000, 8000, 16000];
    const index = Math.min(this.reconnectAttempt, shortDelays.length - 1);
    return shortDelays[index] ?? 16000;
  }

  private async connectUpstream(generation: number) {
    if (generation !== this.reconnectGeneration) return;
    if (!this.active) return;

    this.abortUpstream();
    this.clearWatchdog();

    const url = `${UPSTREAM_BASE}/radio/v1/stream?channel=${encodeURIComponent(this.channel)}&q=${encodeURIComponent(this.quality)}`;
    const connId = generation;
    console.log(`[radio] CONNECT #${connId} attempt=${this.reconnectAttempt} subs=${this.subscribers.size} url=${url}`);

    try {
      const controller = new AbortController();
      this.abortController = controller;

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.8',
        },
        signal: controller.signal,
      });

      if (generation !== this.reconnectGeneration) return;

      if (!response.ok || !response.body) {
        console.log(`[radio] CONNECT #${connId} failed: HTTP ${response.status} hasBody=${response.body !== null}`);
        this.totalBytesLastBurst = 0;
        this.scheduleReconnect(generation);
        return;
      }

      this.lastByteTime = Date.now();
      this.startWatchdog(generation);

      const reader = response.body.getReader();
      let totalBytes = 0;
      let firstBytesHex: string | null = null;

      while (true) {
        if (generation !== this.reconnectGeneration) {
          reader.cancel().catch(() => {});
          console.log(`[radio] CONNECT #${connId} aborted (gen changed) after ${(totalBytes / 1024).toFixed(1)}KB`);
          return;
        }

        let result: { done: boolean; value?: Uint8Array };
        try {
          result = await reader.read() as { done: boolean; value?: Uint8Array };
        } catch {
          this.totalBytesLastBurst = 0;
          console.log(`[radio] CONNECT #${connId} reader error after ${(totalBytes / 1024).toFixed(1)}KB`);
          this.scheduleReconnect(generation);
          return;
        }

        if (result.done) {
          this.totalBytesLastBurst = totalBytes;
          console.log(`[radio] CONNECT #${connId} DONE clean EOF after ${(totalBytes / 1024).toFixed(1)}KB firstBytes=${firstBytesHex}`);
          this.scheduleReconnect(generation);
          return;
        }

        if (result.value && result.value.byteLength > 0) {
          if (firstBytesHex === null) {
            const previewLen = Math.min(result.value.byteLength, 64);
            firstBytesHex = Array.from(result.value.slice(0, previewLen))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
          }
          totalBytes += result.value.byteLength;
          this.lastByteTime = Date.now();
          this.broadcast(result.value);
        }
      }
    } catch (error) {
      this.totalBytesLastBurst = 0;
      console.log(`[radio] CONNECT #${connId} exception: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      if (generation !== this.reconnectGeneration) return;
      this.scheduleReconnect(generation);
    }
  }

  private startWatchdog(generation: number) {
    this.clearWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (generation !== this.reconnectGeneration) {
        this.clearWatchdog();
        return;
      }
      if (!this.active) return;

      const stallDuration = Date.now() - this.lastByteTime;
      if (stallDuration >= WATCHDOG_STALL_MS) {
        this.clearWatchdog();
        this.abortUpstream();
        this.totalBytesLastBurst = 0;
        this.scheduleReconnect(generation);
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  private broadcast(chunk: Uint8Array) {
    const dead: Subscriber[] = [];
    for (const sub of this.subscribers) {
      try {
        sub.write(chunk);
      } catch {
        dead.push(sub);
      }
    }
    for (const d of dead) {
      this.subscribers.delete(d);
    }
    if (this.subscribers.size === 0 && this.active) {
      this.scheduleIdleCleanup();
    }
  }
}

export { RadioBroadcaster };
