'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/joy';
import { Headphones, Play, Pause, Square } from 'lucide-react';

type TtsState = 'not_generated' | 'generating' | 'ready';
type PlaybackState = 'stopped' | 'playing' | 'paused';
const STATUS_POLL_INTERVAL_MS = 3000;

interface TtsPlayerProps {
  slug: string;
  type: 'blog' | 'lore';
  text: string;
  coverImageUrl?: string;
}

interface ExtractedColors {
  primary: string;
  secondary: string;
  tertiary: string;
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
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;

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
  return (
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  );
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
        const colorMap = new Map<string, { count: number; r: number; g: number; b: number }>();

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

        const sorted = Array.from(colorMap.values()).sort(
          (a, b) => b.count - a.count
        );

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
          if (!tooClose) {
            picked.push(candidate);
          }
        }

        while (picked.length < 3) {
          picked.push(picked[picked.length - 1]!);
        }

        resolve({
          primary: ensureMinLuminance(rgbToHex(picked[0]!.r, picked[0]!.g, picked[0]!.b)),
          secondary: ensureMinLuminance(rgbToHex(picked[1]!.r, picked[1]!.g, picked[1]!.b)),
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
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getSafeDuration(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getSafeCurrentTime(value: number, duration: number): number {
  if (!Number.isFinite(value) || value < 0 || duration <= 0) {
    return 0;
  }
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

export function TtsPlayer({ slug, type, text, coverImageUrl }: TtsPlayerProps) {
  const [state, setState] = useState<TtsState>('not_generated');
  const [playback, setPlayback] = useState<PlaybackState>('stopped');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [colors, setColors] = useState<ExtractedColors>({
    primary: ensureMinLuminance('#8b5cf6'),
    secondary: ensureMinLuminance('#a78bfa'),
    tertiary: ensureMinLuminance('#7c3aed'),
  });
  const [colorsLoaded, setColorsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generateRequestInFlightRef = useRef(false);
  const sharedAudioUrl = `/api/tts/audio/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`;

  useEffect(() => {
    if (coverImageUrl && !colorsLoaded) {
      extractDominantColors(coverImageUrl).then((c) => {
        setColors(c);
        setColorsLoaded(true);
      });
    }
  }, [coverImageUrl, colorsLoaded]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const syncTimelineFromAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const timeline = getTimelineState(audio);
    setDuration(timeline.duration);
    setCurrentTime(timeline.currentTime);
    setProgress(timeline.progress);
  }, []);

  const loadReadyAudio = useCallback(
    async (autoplay = false) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!autoplay && !audio.paused) {
        audio.pause();
      }

      audio.currentTime = 0;
      const currentSrc = audio.src;
      if (!currentSrc.endsWith(sharedAudioUrl)) {
        audio.src = sharedAudioUrl;
        audio.load();
      }

      setState('ready');
      setDuration(0);
      setCurrentTime(0);
      setProgress(0);
      setPlayback('stopped');

      if (!autoplay) return;

      try {
        await audio.play();
      } catch {
        setPlayback('stopped');
      }
    },
    [sharedAudioUrl]
  );

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tts/status?slug=${encodeURIComponent(slug)}&type=${encodeURIComponent(type)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status === 'generating') {
        setState('generating');
        return 'generating';
      }
      if (data.status === 'ready') {
        stopPolling();
        await loadReadyAudio();
        return 'ready';
      }
      if (data.status === 'not_generated') {
        if (!generateRequestInFlightRef.current) {
          setState('not_generated');
        }
        return 'not_generated';
      }
    } catch {
      // ignore polling errors
    }
    return null;
  }, [slug, type, loadReadyAudio, stopPolling]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => {
      void checkStatus();
    }, STATUS_POLL_INTERVAL_MS);
  }, [checkStatus]);

  const handleGenerate = useCallback(async () => {
    setState('generating');
    startPolling();
    generateRequestInFlightRef.current = true;

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, slug, type }),
      });

      if (res.status === 409) {
        return;
      }

      if (!res.ok) {
        setState('not_generated');
        return;
      }

      stopPolling();
      await loadReadyAudio(true);
    } catch {
      setState('not_generated');
    } finally {
      generateRequestInFlightRef.current = false;
    }
  }, [text, slug, type, loadReadyAudio, startPolling, stopPolling]);

  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {
        setPlayback('stopped');
      });
    }
  }, []);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayback('stopped');
      setCurrentTime(0);
      setProgress(0);
    }
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      syncTimelineFromAudio();
    };

    const handleDurationChange = () => {
      syncTimelineFromAudio();
    };

    const handleTimeUpdate = () => {
      syncTimelineFromAudio();
    };

    const handlePlaying = () => {
      setPlayback('playing');
      syncTimelineFromAudio();
    };

    const handlePause = () => {
      setPlayback(audio.currentTime > 0 ? 'paused' : 'stopped');
      syncTimelineFromAudio();
    };

    const handleEnded = () => {
      setPlayback('stopped');
      setCurrentTime(0);
      setProgress(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      stopPolling();
    };
  }, [stopPolling, syncTimelineFromAudio]);

  useEffect(() => {
    let isActive = true;

    const syncInitialStatus = async () => {
      const status = await checkStatus();
      if (!isActive || status === 'ready') return;
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
      }}
    >
      {/* Not generated: full-width Listen button */}
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
          height: 36,
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

      {/* Generating: traveling pulse bar */}
      <Box
        sx={{
          ...transitionSx,
          opacity: isVisible('generating') ? 1 : 0,
          transform: isVisible('generating') ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: isVisible('generating') ? 'auto' : 'none',
          position: isVisible('generating') ? 'relative' : 'absolute',
          width: '100%',
          height: 36,
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
          Generating audio...
        </Typography>
      </Box>

      {/* Ready: full-width playback controls */}
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
          height: 36,
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
                width: 36,
                height: 36,
                minHeight: 36,
                color: colors.primary,
                '&:hover': { bgcolor: `${colors.primary}18` },
                '&:focus-visible': {
                  outline: `2px solid ${colors.primary}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Pause size={15} />
            </IconButton>
          ) : (
            <IconButton
              onClick={handlePlay}
              size="sm"
              variant="plain"
              aria-label="Play"
              sx={{
                borderRadius: 0,
                width: 36,
                height: 36,
                minHeight: 36,
                color: colors.primary,
                '&:hover': { bgcolor: `${colors.primary}18` },
                '&:focus-visible': {
                  outline: `2px solid ${colors.primary}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Play size={15} />
            </IconButton>
          )}
          <IconButton
            onClick={handleStop}
            size="sm"
            variant="plain"
            aria-label="Stop"
            sx={{
              borderRadius: 0,
              width: 36,
              height: 36,
              minHeight: 36,
              color: colors.primary,
              '&:hover': { bgcolor: `${colors.primary}18` },
              '&:focus-visible': {
                outline: `2px solid ${colors.primary}`,
                outlineOffset: -2,
              },
            }}
          >
            <Square size={12} />
          </IconButton>
        </Stack>

        <Box
          sx={{
            flex: 1,
            height: '100%',
            position: 'relative',
            bgcolor: 'rgba(255,255,255,0.06)',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            if (!audioRef.current || !audioRef.current.duration) return;
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

        <Typography
          level="body-xs"
          sx={{
            px: 1.25,
            color: 'text.secondary',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            minWidth: 80,
            textAlign: 'right',
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </Typography>
      </Stack>
    </Box>
  );
}
