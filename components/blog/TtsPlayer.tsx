'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/joy';
import { Headphones, Pause, Play, Square } from 'lucide-react';

type TtsState = 'not_generated' | 'generating' | 'ready';
type PlaybackState = 'stopped' | 'playing' | 'paused';
type StatusSource = 'poll' | 'generate' | 'init';

const STATUS_POLL_INTERVAL_MS = 3000;
const CHUNK_RETRY_DELAY_MS = 800;
const MIN_PLAYABLE_CHUNKS = 3;

interface TtsPlayerProps {
  slug: string;
  type: 'blog' | 'lore';
  text: string;
  coverImageUrl?: string;
  onPrimaryColorChange?: (color: string) => void;
}

interface ExtractedColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

interface TtsStatusPayload {
  status: TtsState;
  generated_chunks: number;
  total_chunks: number;
  playable: boolean;
}

function parseStatusPayload(raw: unknown): TtsStatusPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const status = value.status;
  if (status !== 'not_generated' && status !== 'generating' && status !== 'ready') {
    return null;
  }

  const parsedGenerated = Number(value.generated_chunks ?? 0);
  const parsedTotal = Number(value.total_chunks ?? 0);
  const totalChunks =
    Number.isFinite(parsedTotal) && parsedTotal > 0 ? Math.floor(parsedTotal) : 0;
  const generatedChunks =
    Number.isFinite(parsedGenerated) && parsedGenerated > 0
      ? Math.floor(parsedGenerated)
      : 0;
  const boundedGenerated =
    totalChunks > 0 ? Math.min(generatedChunks, totalChunks) : generatedChunks;
  const playable =
    status === 'ready'
      ? true
      : Boolean(value.playable ?? boundedGenerated >= MIN_PLAYABLE_CHUNKS);

  return {
    status,
    generated_chunks: boundedGenerated,
    total_chunks: totalChunks,
    playable,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.min(255, Math.round(c)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function ensureMinLuminance(hex: string, minL = 0.55, maxS = 0.65): string {
  const [r, g, b] = hexToRgb(hex);
  let [h, s, l] = rgbToHsl(r, g, b);
  if (l < minL) l = minL;
  if (s > maxS) s = maxS;
  const [rr, gg, bb] = hslToRgb(h, s, l);
  return rgbToHex(rr, gg, bb);
}

function colorDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function extractDominantColors(imageUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve) => {
    const fallback: ExtractedColors = {
      primary: ensureMinLuminance('#8b5cf6'),
      secondary: ensureMinLuminance('#a78bfa'),
      tertiary: ensureMinLuminance('#7c3aed'),
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fallback);
          return;
        }

        const maxDim = 64;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        const quantize = (v: number) => Math.round(v / 32) * 32;
        const colorMap = new Map<
          string,
          { count: number; r: number; g: number; b: number }
        >();

        for (let i = 0; i < pixels.length; i += 4) {
          const r = quantize(pixels[i] ?? 0);
          const g = quantize(pixels[i + 1] ?? 0);
          const b = quantize(pixels[i + 2] ?? 0);
          const a = pixels[i + 3] ?? 0;
          if (a < 128) continue;
          if (r > 230 && g > 230 && b > 230) continue;
          if (r < 50 && g < 50 && b < 50) continue;

          const key = `${r},${g},${b}`;
          const existing = colorMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            colorMap.set(key, { count: 1, r, g, b });
          }
        }

        const sorted = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
        if (sorted.length === 0) {
          resolve(fallback);
          return;
        }

        const picked: typeof sorted = [sorted[0]!];
        const minDist = 3000;

        for (let i = 1; i < sorted.length && picked.length < 3; i++) {
          const candidate = sorted[i]!;
          const tooClose = picked.some(
            (p) =>
              colorDistance([p.r, p.g, p.b], [candidate.r, candidate.g, candidate.b]) <
              minDist
          );
          if (!tooClose) picked.push(candidate);
        }

        while (picked.length < 3) {
          picked.push(picked[picked.length - 1]!);
        }

        resolve({
          primary: ensureMinLuminance(rgbToHex(picked[0]!.r, picked[0]!.g, picked[0]!.b)),
          secondary: ensureMinLuminance(
            rgbToHex(picked[1]!.r, picked[1]!.g, picked[1]!.b)
          ),
          tertiary: ensureMinLuminance(rgbToHex(picked[2]!.r, picked[2]!.g, picked[2]!.b)),
        });
      } catch {
        resolve(fallback);
      }
    };

    img.onerror = () => resolve(fallback);
    img.src = imageUrl;
  });
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getSafeDuration(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getSafeCurrentTime(value: number, duration: number): number {
  if (!Number.isFinite(value) || value < 0 || duration <= 0) return 0;
  return Math.min(value, duration);
}

function getTimelineState(audio: HTMLAudioElement) {
  const safeDuration = getSafeDuration(audio.duration);
  const safeCurrentTime = getSafeCurrentTime(audio.currentTime, safeDuration);
  return {
    duration: safeDuration,
    currentTime: safeCurrentTime,
    progress:
      safeDuration > 0
        ? Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100))
        : 0,
  };
}

export function TtsPlayer({ slug, type, text, coverImageUrl, onPrimaryColorChange }: TtsPlayerProps) {
  const [state, setState] = useState<TtsState>('not_generated');
  const [playback, setPlayback] = useState<PlaybackState>('stopped');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGenerationActive, setIsGenerationActive] = useState(false);
  const [canSeek, setCanSeek] = useState(false);
  const [colors, setColors] = useState<ExtractedColors>({
    primary: ensureMinLuminance('#8b5cf6'),
    secondary: ensureMinLuminance('#a78bfa'),
    tertiary: ensureMinLuminance('#7c3aed'),
  });
  const [colorsLoaded, setColorsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentChunkObjectUrlRef = useRef<string | null>(null);

  const generateRequestInFlightRef = useRef(false);
  const generationRequestedRef = useRef(false);
  const generationCompleteRef = useRef(false);
  const playbackRef = useRef<PlaybackState>('stopped');

  const streamingActiveRef = useRef(false);
  const streamingShouldPlayRef = useRef(false);
  const currentChunkIndexRef = useRef<number | null>(null);
  const nextChunkIndexRef = useRef(0);
  const generatedChunksRef = useRef(0);
  const totalChunksRef = useRef(0);
  const streamingOffsetRef = useRef(0);
  const chunkDurationsRef = useRef<Map<number, number>>(new Map());

  const sharedAudioUrl = `/api/tts/audio/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`;
  const sharedChunkBaseUrl = `/api/tts/chunk/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`;

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  useEffect(() => {
    if (coverImageUrl && !colorsLoaded) {
      extractDominantColors(coverImageUrl).then((c) => {
        setColors(c);
        setColorsLoaded(true);
      });
    }
  }, [coverImageUrl, colorsLoaded]);

  useEffect(() => {
    onPrimaryColorChange?.(colors.primary);
  }, [colors.primary, onPrimaryColorChange]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const clearChunkRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const revokeCurrentChunkUrl = useCallback(() => {
    const objectUrl = currentChunkObjectUrlRef.current;
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    currentChunkObjectUrlRef.current = null;
  }, []);

  const sumKnownChunkDurations = useCallback((exclusiveEnd: number) => {
    let total = 0;
    for (let i = 0; i < exclusiveEnd; i++) {
      total += chunkDurationsRef.current.get(i) ?? 0;
    }
    return total;
  }, []);

  const syncTimelineFromAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!streamingActiveRef.current) {
      const timeline = getTimelineState(audio);
      setDuration(timeline.duration);
      setCurrentTime(timeline.currentTime);
      setProgress(timeline.progress);
      return;
    }

    const activeIndex = currentChunkIndexRef.current;
    const baseOffset =
      activeIndex !== null
        ? sumKnownChunkDurations(activeIndex)
        : streamingOffsetRef.current;

    const chunkDuration = getSafeDuration(audio.duration);
    const chunkCurrent = getSafeCurrentTime(audio.currentTime, chunkDuration);
    const totalCurrent = baseOffset + chunkCurrent;
    const generatedDuration = sumKnownChunkDurations(generatedChunksRef.current);
    const totalDuration = Math.max(totalCurrent, generatedDuration);
    const nextProgress =
      totalDuration > 0
        ? Math.min(100, Math.max(0, (totalCurrent / totalDuration) * 100))
        : 0;

    setDuration(totalDuration);
    setCurrentTime(totalCurrent);
    setProgress(nextProgress);
  }, [sumKnownChunkDurations]);

  const loadReadyAudio = useCallback(
    async (autoplay = false) => {
      const audio = audioRef.current;
      if (!audio) return;

      clearChunkRetry();
      revokeCurrentChunkUrl();
      streamingActiveRef.current = false;
      streamingShouldPlayRef.current = false;
      currentChunkIndexRef.current = null;
      nextChunkIndexRef.current = 0;
      chunkDurationsRef.current.clear();
      streamingOffsetRef.current = 0;
      setCanSeek(true);
      setState('ready');
      setPlayback('stopped');
      setDuration(0);
      setCurrentTime(0);
      setProgress(0);

      if (!autoplay && !audio.paused) {
        audio.pause();
      }

      audio.currentTime = 0;
      const currentSrc = audio.src;
      if (!currentSrc.endsWith(sharedAudioUrl)) {
        audio.src = sharedAudioUrl;
        audio.load();
      }

      if (!autoplay) return;
      try {
        await audio.play();
      } catch {
        setPlayback('stopped');
      }
    },
    [clearChunkRetry, revokeCurrentChunkUrl, sharedAudioUrl]
  );

  const tryStartChunkPlayback = useCallback(
    async (chunkIndex: number, autoplay: boolean): Promise<boolean> => {
      const audio = audioRef.current;
      if (!audio || !streamingActiveRef.current) return false;

      if (
        generationCompleteRef.current &&
        totalChunksRef.current > 0 &&
        chunkIndex >= totalChunksRef.current
      ) {
        return false;
      }

      if (generatedChunksRef.current <= chunkIndex) {
        if (autoplay && streamingShouldPlayRef.current) {
          clearChunkRetry();
          retryTimeoutRef.current = setTimeout(() => {
            void tryStartChunkPlayback(chunkIndex, true);
          }, CHUNK_RETRY_DELAY_MS);
        }
        return false;
      }

      try {
        const response = await fetch(`${sharedChunkBaseUrl}/${chunkIndex}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          if (
            (response.status === 404 || response.status === 425) &&
            autoplay &&
            streamingShouldPlayRef.current
          ) {
            clearChunkRetry();
            retryTimeoutRef.current = setTimeout(() => {
              void tryStartChunkPlayback(chunkIndex, true);
            }, CHUNK_RETRY_DELAY_MS);
          }
          return false;
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        revokeCurrentChunkUrl();
        currentChunkObjectUrlRef.current = objectUrl;

        currentChunkIndexRef.current = chunkIndex;
        nextChunkIndexRef.current = chunkIndex + 1;
        streamingOffsetRef.current = sumKnownChunkDurations(chunkIndex);

        audio.src = objectUrl;
        audio.currentTime = 0;
        audio.load();
        syncTimelineFromAudio();

        if (!autoplay || !streamingShouldPlayRef.current) return true;
        try {
          await audio.play();
          return true;
        } catch {
          setPlayback('stopped');
          return false;
        }
      } catch {
        if (autoplay && streamingShouldPlayRef.current) {
          clearChunkRetry();
          retryTimeoutRef.current = setTimeout(() => {
            void tryStartChunkPlayback(chunkIndex, true);
          }, CHUNK_RETRY_DELAY_MS);
        }
        return false;
      }
    },
    [
      clearChunkRetry,
      revokeCurrentChunkUrl,
      sharedChunkBaseUrl,
      sumKnownChunkDurations,
      syncTimelineFromAudio,
    ]
  );

  const beginStreamingPlayback = useCallback(async () => {
    if (streamingActiveRef.current) return;

    streamingActiveRef.current = true;
    streamingShouldPlayRef.current = true;
    currentChunkIndexRef.current = null;
    nextChunkIndexRef.current = 0;
    streamingOffsetRef.current = 0;
    chunkDurationsRef.current.clear();

    setCanSeek(false);
    setState('ready');
    setPlayback('stopped');
    setDuration(0);
    setCurrentTime(0);
    setProgress(0);

    await tryStartChunkPlayback(0, true);
  }, [tryStartChunkPlayback]);

  const prepareStreamingControls = useCallback(() => {
    if (streamingActiveRef.current) return;

    clearChunkRetry();
    revokeCurrentChunkUrl();
    streamingShouldPlayRef.current = false;
    currentChunkIndexRef.current = null;
    nextChunkIndexRef.current = 0;
    streamingOffsetRef.current = 0;
    chunkDurationsRef.current.clear();

    setCanSeek(false);
    setState('ready');
    setPlayback('stopped');
    setDuration(0);
    setCurrentTime(0);
    setProgress(0);
  }, [clearChunkRetry, revokeCurrentChunkUrl]);

  const applyStatus = useCallback(
    async (statusData: TtsStatusPayload, source: StatusSource): Promise<TtsState> => {
      generatedChunksRef.current = statusData.generated_chunks;
      totalChunksRef.current = statusData.total_chunks;
      generationCompleteRef.current = statusData.status === 'ready';
      setIsGenerationActive(statusData.status === 'generating');

      if (statusData.status === 'ready') {
        stopPolling();

        if (streamingActiveRef.current) {
          setState('ready');
          if (playbackRef.current === 'stopped') {
            await loadReadyAudio(false);
          }
          return 'ready';
        }

        const shouldAutoplay = source === 'generate' && generationRequestedRef.current;
        await loadReadyAudio(shouldAutoplay);
        return 'ready';
      }

      if (statusData.status === 'generating') {
        const canStartPlayback =
          statusData.playable || statusData.generated_chunks >= MIN_PLAYABLE_CHUNKS;

        if (!streamingActiveRef.current && canStartPlayback && !generationRequestedRef.current) {
          prepareStreamingControls();
        } else if (!streamingActiveRef.current) {
          setState('generating');
        } else {
          setState('ready');
        }

        if (
          canStartPlayback &&
          generationRequestedRef.current &&
          !streamingActiveRef.current
        ) {
          await beginStreamingPlayback();
        }
        return 'generating';
      }

      if (!generateRequestInFlightRef.current && !streamingActiveRef.current) {
        setState('not_generated');
      }
      return 'not_generated';
    },
    [beginStreamingPlayback, loadReadyAudio, prepareStreamingControls, stopPolling]
  );

  const checkStatus = useCallback(
    async (source: StatusSource = 'poll') => {
      try {
        const response = await fetch(
          `/api/tts/status?slug=${encodeURIComponent(slug)}&type=${encodeURIComponent(type)}`,
          { cache: 'no-store' }
        );
        if (!response.ok) return null;
        const raw = await response.json();
        const payload = parseStatusPayload(raw);
        if (!payload) return null;
        return await applyStatus(payload, source);
      } catch {
        return null;
      }
    },
    [applyStatus, slug, type]
  );

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      void checkStatus('poll');
    }, STATUS_POLL_INTERVAL_MS);
  }, [checkStatus]);

  const handleGenerate = useCallback(async () => {
    setState('generating');
    setIsGenerationActive(true);
    setCanSeek(false);
    startPolling();
    generationRequestedRef.current = true;
    generateRequestInFlightRef.current = true;

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, slug, type }),
      });

      let payload: TtsStatusPayload | null = null;
      try {
        payload = parseStatusPayload(await response.json());
      } catch {
        payload = null;
      }

      if (payload) {
        await applyStatus(payload, 'generate');
        return;
      }

      if (response.status === 409 || response.ok) {
        await checkStatus('generate');
        return;
      }

      setState('not_generated');
      setIsGenerationActive(false);
      generationRequestedRef.current = false;
    } catch {
      setState('not_generated');
      setIsGenerationActive(false);
      generationRequestedRef.current = false;
    } finally {
      generateRequestInFlightRef.current = false;
    }
  }, [applyStatus, checkStatus, slug, startPolling, text, type]);

  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (streamingActiveRef.current) {
      streamingShouldPlayRef.current = true;
      clearChunkRetry();

      if (audio.src && audio.paused) {
        audio.play().catch(() => {
          setPlayback('stopped');
        });
        return;
      }

      void tryStartChunkPlayback(nextChunkIndexRef.current, true);
      return;
    }

    if (!generationCompleteRef.current && generatedChunksRef.current >= MIN_PLAYABLE_CHUNKS) {
      void beginStreamingPlayback();
      return;
    }

    audio.play().catch(() => {
      setPlayback('stopped');
    });
  }, [beginStreamingPlayback, clearChunkRetry, tryStartChunkPlayback]);

  const handlePause = useCallback(() => {
    if (!audioRef.current) return;
    if (streamingActiveRef.current) {
      streamingShouldPlayRef.current = false;
      clearChunkRetry();
    }
    audioRef.current.pause();
  }, [clearChunkRetry]);

  const handleStop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (streamingActiveRef.current) {
      streamingShouldPlayRef.current = false;
      clearChunkRetry();
      audio.pause();
      audio.currentTime = 0;
      currentChunkIndexRef.current = null;
      nextChunkIndexRef.current = 0;
      streamingOffsetRef.current = 0;
      setPlayback('stopped');
      setCurrentTime(0);
      setProgress(0);
      if (generationCompleteRef.current) {
        void loadReadyAudio(false);
      }
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setPlayback('stopped');
    setCurrentTime(0);
    setProgress(0);
  }, [clearChunkRetry, loadReadyAudio]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (streamingActiveRef.current) {
        const activeIndex = currentChunkIndexRef.current;
        if (activeIndex !== null) {
          const safe = getSafeDuration(audio.duration);
          if (safe > 0) {
            chunkDurationsRef.current.set(activeIndex, safe);
          }
        }
      }
      syncTimelineFromAudio();
    };

    const handleDurationChange = () => {
      if (streamingActiveRef.current) {
        const activeIndex = currentChunkIndexRef.current;
        if (activeIndex !== null) {
          const safe = getSafeDuration(audio.duration);
          if (safe > 0) {
            chunkDurationsRef.current.set(activeIndex, safe);
          }
        }
      }
      syncTimelineFromAudio();
    };

    const handleTimeUpdate = () => {
      syncTimelineFromAudio();
    };

    const handlePlayingEvent = () => {
      setPlayback('playing');
      syncTimelineFromAudio();
    };

    const handlePauseEvent = () => {
      setPlayback(audio.currentTime > 0 ? 'paused' : 'stopped');
      syncTimelineFromAudio();
    };

    const handleEnded = () => {
      if (streamingActiveRef.current) {
        const nextIndex =
          currentChunkIndexRef.current === null
            ? nextChunkIndexRef.current
            : currentChunkIndexRef.current + 1;

        nextChunkIndexRef.current = nextIndex;

        if (!streamingShouldPlayRef.current) {
          setPlayback('paused');
          return;
        }

        if (
          generationCompleteRef.current &&
          totalChunksRef.current > 0 &&
          nextIndex >= totalChunksRef.current
        ) {
          streamingActiveRef.current = false;
          streamingShouldPlayRef.current = false;
          setPlayback('stopped');
          setCurrentTime(0);
          setProgress(0);
          void loadReadyAudio(false);
          return;
        }

        void tryStartChunkPlayback(nextIndex, true);
        return;
      }

      setPlayback('stopped');
      setCurrentTime(0);
      setProgress(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('playing', handlePlayingEvent);
    audio.addEventListener('pause', handlePauseEvent);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('playing', handlePlayingEvent);
      audio.removeEventListener('pause', handlePauseEvent);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      stopPolling();
      clearChunkRetry();
      revokeCurrentChunkUrl();
    };
  }, [
    clearChunkRetry,
    loadReadyAudio,
    revokeCurrentChunkUrl,
    stopPolling,
    syncTimelineFromAudio,
    tryStartChunkPlayback,
  ]);

  useEffect(() => {
    let isActive = true;

    const syncInitialStatus = async () => {
      const currentStatus = await checkStatus('init');
      if (!isActive || currentStatus === 'ready') return;
      startPolling();
    };

    void syncInitialStatus();

    return () => {
      isActive = false;
    };
  }, [checkStatus, startPolling]);

  const gradientBg = useMemo(
    () =>
      `linear-gradient(to right, ${colors.tertiary}, ${colors.secondary}, ${colors.primary}, ${colors.secondary}, ${colors.tertiary})`,
    [colors]
  );

  const isVisible = (target: TtsState) => state === target;
  const showGeneratingBadge = state === 'ready' && isGenerationActive;
  const transitionSx = {
    transition: 'opacity 0.35s ease, transform 0.35s ease',
  };

  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
        '@keyframes tts-traveling-pulse': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        '@keyframes tts-dot-pulse': {
          '0%': { transform: 'scale(0.85)', opacity: 0.55 },
          '50%': { transform: 'scale(1)', opacity: 1 },
          '100%': { transform: 'scale(0.85)', opacity: 0.55 },
        },
      }}
    >
      <Box
        onClick={handleGenerate}
        role="button"
        tabIndex={isVisible('not_generated') ? 0 : -1}
        aria-label="Generate audio for this post"
        aria-hidden={!isVisible('not_generated')}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGenerate();
          }
        }}
        sx={{
          ...transitionSx,
          opacity: isVisible('not_generated') ? 1 : 0,
          transform: isVisible('not_generated') ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: isVisible('not_generated') ? 'auto' : 'none',
          position: isVisible('not_generated') ? 'relative' : 'absolute',
          width: '100%',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          borderRadius: 0,
          border: '1px solid',
          borderColor: `${colors.primary}50`,
          bgcolor: `${colors.primary}10`,
          cursor: 'pointer',
          color: colors.primary,
          '&:hover': {
            bgcolor: `${colors.primary}20`,
            borderColor: colors.primary,
          },
          '&:focus-visible': {
            outline: `2px solid ${colors.primary}`,
            outlineOffset: 2,
          },
        }}
      >
        <Headphones size={16} />
        <Typography level="body-sm" sx={{ color: 'inherit', fontWeight: 600 }}>
          Listen
        </Typography>
      </Box>

      <Box
        sx={{
          ...transitionSx,
          opacity: isVisible('generating') ? 1 : 0,
          transform: isVisible('generating') ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: isVisible('generating') ? 'auto' : 'none',
          position: isVisible('generating') ? 'relative' : 'absolute',
          width: '100%',
          height: 44,
          borderRadius: 0,
          bgcolor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: `${colors.primary}40`,
        }}
        role="progressbar"
        aria-label="Generating audio"
        aria-hidden={!isVisible('generating')}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '25%',
            background: gradientBg,
            animation: 'tts-traveling-pulse 1.8s ease-in-out infinite',
          }}
        />
        <Typography
          level="body-xs"
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '0.75rem',
            zIndex: 1,
          }}
        >
          Preparing audio...
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing={0}
        alignItems="center"
        aria-hidden={!isVisible('ready')}
        sx={{
          ...transitionSx,
          opacity: isVisible('ready') ? 1 : 0,
          transform: isVisible('ready') ? 'translateY(0)' : 'translateY(8px)',
          pointerEvents: isVisible('ready') ? 'auto' : 'none',
          position: isVisible('ready') ? 'relative' : 'absolute',
          width: '100%',
          height: 44,
          borderRadius: 0,
          border: '1px solid',
          borderColor: `${colors.primary}40`,
          bgcolor: 'rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}
      >
        <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
          {playback === 'playing' ? (
            <IconButton
              onClick={handlePause}
              size="sm"
              variant="plain"
              aria-label="Pause"
              sx={{
                borderRadius: 0,
                width: 44,
                height: 44,
                minHeight: 44,
                color: colors.primary,
                '&:hover': { bgcolor: `${colors.primary}18` },
                '&:focus-visible': {
                  outline: `2px solid ${colors.primary}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Pause size={16} />
            </IconButton>
          ) : (
            <IconButton
              onClick={handlePlay}
              size="sm"
              variant="plain"
              aria-label="Play"
              sx={{
                borderRadius: 0,
                width: 44,
                height: 44,
                minHeight: 44,
                color: colors.primary,
                '&:hover': { bgcolor: `${colors.primary}18` },
                '&:focus-visible': {
                  outline: `2px solid ${colors.primary}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Play size={16} />
            </IconButton>
          )}
          <IconButton
            onClick={handleStop}
            size="sm"
            variant="plain"
            aria-label="Stop"
            sx={{
              borderRadius: 0,
              width: 44,
              height: 44,
              minHeight: 44,
              color: colors.primary,
              '&:hover': { bgcolor: `${colors.primary}18` },
              '&:focus-visible': {
                outline: `2px solid ${colors.primary}`,
                outlineOffset: -2,
              },
            }}
          >
            <Square size={13} />
          </IconButton>
        </Stack>

        <Box
          sx={{
            flex: 1,
            height: '100%',
            position: 'relative',
            bgcolor: 'rgba(255,255,255,0.06)',
            cursor: canSeek ? 'pointer' : 'default',
          }}
          onClick={(e) => {
            if (!canSeek || !audioRef.current || !audioRef.current.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = ratio * audioRef.current.duration;
          }}
          role="slider"
          aria-label="Audio progress"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemax={Math.round(duration)}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress}%`,
              background: gradientBg,
              transition: 'width 0.15s linear',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              bottom: 4,
              width: 3,
              left: `${progress}%`,
              transform: 'translateX(-50%)',
              bgcolor: colors.primary,
              borderRadius: 0,
              boxShadow: `0 0 4px ${colors.primary}80`,
            }}
          />
        </Box>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            pl: 1,
            pr: 1.25,
            flexShrink: 0,
          }}
        >
          {showGeneratingBadge && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              aria-label="Audio generation in progress"
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: colors.primary,
                  animation: 'tts-dot-pulse 1.1s ease-in-out infinite',
                }}
              />
              <Typography
                level="body-xs"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.68rem',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                Generating...
              </Typography>
            </Stack>
          )}

          <Typography
            level="body-xs"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              minWidth: 80,
              textAlign: 'right',
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
