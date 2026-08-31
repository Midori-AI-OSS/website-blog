import type { RadioEnvelope } from './contract';
import { isRadioEnvelope, MIDORIAI_RADIO_API_VERSION, MIDORIAI_RADIO_BASE_URL } from './contract';

/** The upstream probe is allowed to take as long as the client startup budget. */
export const RADIO_HEALTH_UPSTREAM_TIMEOUT_MS = 5_500;

/** Health is refreshed in the background at most twice per hour. */
export const RADIO_HEALTH_REFRESH_INTERVAL_MS = 30 * 60 * 1_000;

const RADIO_HEALTH_URL = `${MIDORIAI_RADIO_BASE_URL}/health`;
const GLOBAL_STATE_KEY = '__midoriaiRadioHealthManagerState__';
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
} as const;

export type RadioHealthEnvelope = RadioEnvelope<unknown>;

interface RadioErrorShape {
  code: string;
  message: string;
}

interface RadioHealthState {
  cachedEnvelope: RadioHealthEnvelope | null;
  inFlightProbe: Promise<RadioHealthEnvelope> | null;
  bootInitialization: Promise<void> | null;
  refreshTimer: ReturnType<typeof setInterval> | null;
  generation: number;
}

class RadioHealthProbeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RadioHealthProbeError';
    this.code = code;
  }
}

function createState(): RadioHealthState {
  return {
    cachedEnvelope: null,
    inFlightProbe: null,
    bootInitialization: null,
    refreshTimer: null,
    generation: 0,
  };
}

function getProcessState(): RadioHealthState {
  const processGlobal = globalThis as typeof globalThis & Record<string, unknown>;
  const existing = processGlobal[GLOBAL_STATE_KEY];
  if (existing && typeof existing === 'object') {
    return existing as RadioHealthState;
  }

  const created = createState();
  processGlobal[GLOBAL_STATE_KEY] = created;
  return created;
}

const state = getProcessState();

function isRadioError(value: unknown): value is RadioErrorShape {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

/**
 * Accept only complete radio.v1 envelopes that can safely be served from the
 * process cache. Both online and explicitly reported offline envelopes are
 * valid; malformed variants are replaced with our own offline envelope.
 */
export function isValidatedRadioHealthEnvelope(value: unknown): value is RadioHealthEnvelope {
  if (!isRadioEnvelope(value) || value.version !== MIDORIAI_RADIO_API_VERSION) {
    return false;
  }

  if (value.ok) {
    return value.data !== null && value.error === null;
  }

  return value.data === null && isRadioError(value.error);
}

function offlineEnvelope(code: string, message: string): RadioHealthEnvelope {
  return {
    version: MIDORIAI_RADIO_API_VERSION,
    ok: false,
    now: new Date().toISOString(),
    data: null,
    error: { code, message },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown upstream error';
}

function isTimerWithUnref(value: unknown): value is { unref: () => void } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'unref' in value &&
    typeof (value as { unref?: unknown }).unref === 'function'
  );
}

async function requestUpstreamHealth(): Promise<RadioHealthEnvelope> {
  const controller = new AbortController();
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const request = (async () => {
    const response = await fetch(RADIO_HEALTH_URL, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new RadioHealthProbeError(
        'INVALID_UPSTREAM_ENVELOPE',
        'Radio health returned invalid JSON',
      );
    }

    if (!isValidatedRadioHealthEnvelope(payload)) {
      throw new RadioHealthProbeError(
        'UPSTREAM_UNHEALTHY',
        `Radio health returned HTTP ${response.status}`,
      );
    }

    // A successful envelope sent with an HTTP error must not be cached as
    // online. Explicit radio.v1 offline envelopes remain useful as-is.
    if (!response.ok && payload.ok) {
      throw new RadioHealthProbeError(
        'UPSTREAM_UNHEALTHY',
        `Radio health returned HTTP ${response.status}`,
      );
    }

    return payload;
  })();

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new RadioHealthProbeError('UPSTREAM_TIMEOUT', 'Radio health probe timed out'));
    }, RADIO_HEALTH_UPSTREAM_TIMEOUT_MS);
  });

  try {
    return await Promise.race([request, timeout]);
  } catch (error) {
    if (error instanceof RadioHealthProbeError) {
      throw error;
    }

    if (timedOut || controller.signal.aborted) {
      throw new RadioHealthProbeError('UPSTREAM_TIMEOUT', 'Radio health probe timed out');
    }

    throw new RadioHealthProbeError('UPSTREAM_UNREACHABLE', errorMessage(error));
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function probeAndCache(generation: number): Promise<RadioHealthEnvelope> {
  let envelope: RadioHealthEnvelope;
  try {
    envelope = await requestUpstreamHealth();
  } catch (error) {
    const probeError =
      error instanceof RadioHealthProbeError
        ? error
        : new RadioHealthProbeError('UPSTREAM_UNREACHABLE', errorMessage(error));
    envelope = offlineEnvelope(probeError.code, probeError.message);
  }

  if (state.generation === generation) {
    state.cachedEnvelope = envelope;
  }

  return envelope;
}

function requestProbe(generation: number): Promise<RadioHealthEnvelope> {
  const existing = state.inFlightProbe;
  if (existing !== null) {
    return existing;
  }

  const probe = probeAndCache(generation);
  const tracked = probe.finally(() => {
    if (state.inFlightProbe === tracked) {
      state.inFlightProbe = null;
    }
  });
  state.inFlightProbe = tracked;
  return tracked;
}

function ensureRefreshTimer(): void {
  if (state.refreshTimer !== null) {
    return;
  }

  state.refreshTimer = setInterval(() => {
    void refreshRadioHealth();
  }, RADIO_HEALTH_REFRESH_INTERVAL_MS);

  if (isTimerWithUnref(state.refreshTimer)) {
    state.refreshTimer.unref();
  }
}

/**
 * Starts the process-wide startup probe and refresh timer. The returned
 * promise represents probe completion for request handlers; callers such as
 * Next's instrumentation hook deliberately do not need to await it.
 */
export function startRadioHealthMonitor(): Promise<void> {
  ensureRefreshTimer();

  if (state.bootInitialization !== null) {
    return state.bootInitialization;
  }

  const probe = requestProbe(state.generation);
  state.bootInitialization = probe.then(() => undefined);
  return state.bootInitialization;
}

export const initializeRadioHealth = startRadioHealthMonitor;

/** Refreshes the same cache using the same shared in-flight probe. */
export function refreshRadioHealth(): Promise<void> {
  return requestProbe(state.generation).then(() => undefined);
}

/** Returns the validated startup snapshot; request handlers never probe here. */
export async function getRadioHealth(): Promise<RadioHealthEnvelope> {
  await startRadioHealthMonitor();
  return (
    state.cachedEnvelope ?? offlineEnvelope('RADIO_HEALTH_UNAVAILABLE', 'Radio health unavailable')
  );
}

export const getCachedRadioHealth = getRadioHealth;

export const RADIO_HEALTH_NO_STORE_HEADERS = NO_STORE_HEADERS;

/** Test-only reset; stale probes cannot repopulate a newer generation. */
export function resetRadioHealthManagerForTests(): void {
  state.generation += 1;
  if (state.refreshTimer !== null) {
    clearInterval(state.refreshTimer);
  }
  state.cachedEnvelope = null;
  state.inFlightProbe = null;
  state.bootInitialization = null;
  state.refreshTimer = null;
}
