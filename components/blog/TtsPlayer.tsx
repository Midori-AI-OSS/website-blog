'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/joy';
import { Headphones, Play, Pause, Square } from 'lucide-react';

type TtsState = 'not_generated' | 'generating' | 'ready';
type PlaybackState = 'stopped' | 'playing' | 'paused';

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
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      tertiary: '#7c3aed',
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
          if (r < 25 && g < 25 && b < 25) continue;

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
          primary: rgbToHex(picked[0]!.r, picked[0]!.g, picked[0]!.b),
          secondary: rgbToHex(picked[1]!.r, picked[1]!.g, picked[1]!.b),
          tertiary: rgbToHex(picked[2]!.r, picked[2]!.g, picked[2]!.b),
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
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TtsPlayer({ slug, type, text, coverImageUrl }: TtsPlayerProps) {
  const [state, setState] = useState<TtsState>('not_generated');
  const [playback, setPlayback] = useState<PlaybackState>('stopped');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [colors, setColors] = useState<ExtractedColors>({
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    tertiary: '#7c3aed',
  });
  const [colorsLoaded, setColorsLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (coverImageUrl && !colorsLoaded) {
      extractDominantColors(coverImageUrl).then((c) => {
        setColors(c);
        setColorsLoaded(true);
      });
    }
  }, [coverImageUrl, colorsLoaded]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tts/status?slug=${encodeURIComponent(slug)}&type=${encodeURIComponent(type)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'ready') {
        setState('ready');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch {
      // ignore polling errors
    }
  }, [slug, type]);

  const handleGenerate = useCallback(async () => {
    setState('generating');

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, slug, type }),
      });

      if (res.status === 409) {
        if (!pollingRef.current) {
          pollingRef.current = setInterval(checkStatus, 3000);
        }
        return;
      }

      if (!res.ok) {
        setState('not_generated');
        return;
      }

      const blob = await res.blob();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }

      setState('ready');
      setPlayback('playing');

      setTimeout(() => {
        audioRef.current?.play().catch(() => {
          setPlayback('stopped');
        });
      }, 100);
    } catch {
      setState('not_generated');
    }
  }, [text, slug, type, checkStatus]);

  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setPlayback('playing');
    }
  }, []);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayback('paused');
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

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || 0);
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener('ended', () => {
      setPlayback('stopped');
      setCurrentTime(0);
      setProgress(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const gradientBg = useMemo(
    () =>
      `linear-gradient(to right, ${colors.tertiary}, ${colors.secondary}, ${colors.primary}, ${colors.secondary}, ${colors.tertiary})`,
    [colors]
  );

  return (
    <Box
      sx={{
        '@keyframes tts-traveling-pulse': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        width: { xs: '100%', sm: 'auto' },
        minWidth: { sm: 200 },
        maxWidth: { sm: 320 },
      }}
    >
      {/* Not generated: Listen button */}
      {state === 'not_generated' && (
        <IconButton
          onClick={handleGenerate}
          variant="outlined"
          size="sm"
          sx={{
            borderRadius: 0,
            borderColor: colors.primary,
            color: colors.primary,
            bgcolor: 'transparent',
            px: 1.5,
            gap: 0.5,
            '&:hover': {
              bgcolor: `${colors.primary}18`,
              borderColor: colors.primary,
            },
            '&:focus-visible': {
              outline: `2px solid ${colors.primary}`,
              outlineOffset: 2,
            },
            minHeight: 32,
          }}
          aria-label="Generate audio for this post"
        >
          <Headphones size={14} />
          <Typography level="body-xs" sx={{ color: 'inherit', fontWeight: 600 }}>
            Listen
          </Typography>
        </IconButton>
      )}

      {/* Generating: traveling pulse bar */}
      {state === 'generating' && (
        <Box
          sx={{
            width: '100%',
            height: 28,
            borderRadius: 0,
            bgcolor: 'rgba(255,255,255,0.08)',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: `${colors.primary}40`,
          }}
          role="progressbar"
          aria-label="Generating audio"
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
              fontSize: '0.7rem',
              zIndex: 1,
            }}
          >
            Generating...
          </Typography>
        </Box>
      )}

      {/* Ready: playback controls */}
      {state === 'ready' && (
        <Stack
          direction="row"
          spacing={0}
          alignItems="center"
          sx={{
            width: '100%',
            height: 28,
            borderRadius: 0,
            border: '1px solid',
            borderColor: `${colors.primary}40`,
            bgcolor: 'rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Play / Pause / Stop buttons */}
          <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
            {playback === 'playing' ? (
              <IconButton
                onClick={handlePause}
                size="sm"
                variant="plain"
                aria-label="Pause"
                sx={{
                  borderRadius: 0,
                  width: 28,
                  height: 28,
                  minHeight: 28,
                  color: colors.primary,
                  '&:hover': { bgcolor: `${colors.primary}18` },
                  '&:focus-visible': {
                    outline: `2px solid ${colors.primary}`,
                    outlineOffset: -2,
                  },
                }}
              >
                <Pause size={13} />
              </IconButton>
            ) : (
              <IconButton
                onClick={handlePlay}
                size="sm"
                variant="plain"
                aria-label="Play"
                sx={{
                  borderRadius: 0,
                  width: 28,
                  height: 28,
                  minHeight: 28,
                  color: colors.primary,
                  '&:hover': { bgcolor: `${colors.primary}18` },
                  '&:focus-visible': {
                    outline: `2px solid ${colors.primary}`,
                    outlineOffset: -2,
                  },
                }}
              >
                <Play size={13} />
              </IconButton>
            )}
            <IconButton
              onClick={handleStop}
              size="sm"
              variant="plain"
              aria-label="Stop"
              sx={{
                borderRadius: 0,
                width: 28,
                height: 28,
                minHeight: 28,
                color: colors.primary,
                '&:hover': { bgcolor: `${colors.primary}18` },
                '&:focus-visible': {
                  outline: `2px solid ${colors.primary}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Square size={11} />
            </IconButton>
          </Stack>

          {/* Progress bar */}
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
            {/* Playhead pip */}
            <Box
              sx={{
                position: 'absolute',
                top: 2,
                bottom: 2,
                width: 3,
                left: `${progress}%`,
                transform: 'translateX(-50%)',
                bgcolor: colors.primary,
                borderRadius: 0,
                boxShadow: `0 0 4px ${colors.primary}80`,
              }}
            />
          </Box>

          {/* Time display */}
          <Typography
            level="body-xs"
            sx={{
              px: 1,
              color: 'text.secondary',
              fontSize: '0.65rem',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minWidth: 72,
              textAlign: 'right',
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
