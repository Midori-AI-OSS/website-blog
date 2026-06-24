'use client';

import { keyframes } from '@emotion/react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Sheet from '@mui/joy/Sheet';
import Skeleton from '@mui/joy/Skeleton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Music, Pause, Play, Radio, StepBack, StepForward, Users, Volume2 } from 'lucide-react';
import * as React from 'react';
import BlobProgressBar from '@/components/radio/BlobProgressBar';
import {
  fetchArt,
  fetchChannels,
  fetchCurrent,
  RadioApiError,
  sendHeartbeat,
} from '@/lib/radio/client';
import {
  type ArtPayload,
  buildStreamUrl,
  type ChannelEntry,
  type CurrentPayload,
  normalizeChannel,
  normalizeQuality,
  type QualityName,
} from '@/lib/radio/contract';
import { appendTrackCacheKey } from '@/lib/radio/images';
import {
  loadRadioState,
  MIDORIAI_RADIO_CHANNEL_KEY,
  MIDORIAI_RADIO_PLAYING_KEY,
  MIDORIAI_RADIO_QUALITY_KEY,
  MIDORIAI_RADIO_STATE_EVENT,
  MIDORIAI_RADIO_VOLUME_KEY,
  type RadioStateChangeDetail,
  saveRadioChannel,
  saveRadioPlaying,
  saveRadioQuality,
  saveRadioVolume,
} from '@/lib/radio/state';
import type { ExtractedPalette } from '@/lib/theme/artPalette';

const coverSlideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

type StreamState = 'idle' | 'loading' | 'playing' | 'error';

interface ProbeMetadata {
  ok: boolean;
  artist?: string | null;
  comment?: string | null;
  sample_rate?: number | null;
  channels?: number | null;
  bit_rate?: number | null;
  midori_ai_vibe_summary?: string | null;
  midori_ai_listener_takeaway?: string | null;
  midori_ai_why_made?: string | null;
  midori_ai_backstory?: string | null;
  midori_ai_radio_reason?: string | null;
  midori_ai_music_theme?: string | null;
  midori_ai_vibe_analysis?: string | null;
  error?: {
    code: string;
    message: string;
  };
}

interface ProgressSnapshot {
  positionMs: number;
  durationMs: number;
  updatedAtMs: number;
}

const DEFAULT_CHANNELS: ChannelEntry[] = [{ name: 'all', track_count: 0 }];
const CURRENT_REFRESH_MS = 10_000;
const HEARTBEAT_MS = 30_000;
const PROBE_DEBOUNCE_MS = 350;

function clampVolume(input: number): number {
  if (Number.isNaN(input)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, input));
}

function clampProgress(positionMs: number, durationMs: number): number {
  if (!Number.isFinite(positionMs) || !Number.isFinite(durationMs) || durationMs <= 0) {
    return 0;
  }

  return Math.min(durationMs, Math.max(0, positionMs));
}

function formatTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof RadioApiError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown radio error';
}

function getStreamStateLabel(streamState: StreamState): string {
  if (streamState === 'playing') {
    return 'Live';
  }

  if (streamState === 'loading') {
    return 'Connecting…';
  }

  if (streamState === 'error') {
    return 'Needs retry';
  }

  return 'Idle';
}

export default function RadioPageClient() {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const channelRef = React.useRef('all');
  const qualityRef = React.useRef<QualityName>('medium');
  const volumeRef = React.useRef(0.5);
  const playbackDesiredRef = React.useRef(false);
  const restartNonceRef = React.useRef(0);
  const startPlaybackRef = React.useRef<() => void>(() => {});
  const progressSnapshotRef = React.useRef<ProgressSnapshot>({
    positionMs: 0,
    durationMs: 0,
    updatedAtMs: Date.now(),
  });
  const currentRequestRef = React.useRef(0);
  const artRequestRef = React.useRef(0);
  const sessionIdRef = React.useRef<string | null>(null);
  const heartbeatIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const bgLayerRef = React.useRef<HTMLDivElement | null>(null);
  const prevArtUrlRef = React.useRef<string | null>(null);

  const [hydrated, setHydrated] = React.useState(false);
  const [volume, setVolume] = React.useState(0.5);
  const [quality, setQuality] = React.useState<QualityName>('medium');
  const [channel, setChannel] = React.useState('all');
  const [playbackDesired, setPlaybackDesired] = React.useState(false);
  const [streamState, setStreamState] = React.useState<StreamState>('idle');
  const [restartNonce, setRestartNonce] = React.useState(0);

  const [channels, setChannels] = React.useState<ChannelEntry[]>([]);
  const [listenerCount, setListenerCount] = React.useState<number | null>(null);
  const [currentTrack, setCurrentTrack] = React.useState<CurrentPayload | null>(null);
  const [_artMetadata, setArtMetadata] = React.useState<ArtPayload | null>(null);
  const [artUrl, setArtUrl] = React.useState<string | null>(null);
  const [artPalette, setArtPalette] = React.useState<ExtractedPalette | null>(null);
  const [probeData, setProbeData] = React.useState<ProbeMetadata | null>(null);
  const [probeLoading, setProbeLoading] = React.useState(false);
  const [positionMs, setPositionMs] = React.useState(0);
  const [durationMs, setDurationMs] = React.useState(0);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [volHovered, setVolHovered] = React.useState(false);
  const volLeaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTrackId = currentTrack?.track_id ?? null;

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  React.useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  React.useEffect(() => {
    playbackDesiredRef.current = playbackDesired;
  }, [playbackDesired]);

  React.useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  React.useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  React.useEffect(() => {
    restartNonceRef.current = restartNonce;
  }, [restartNonce]);

  React.useEffect(() => {
    const layer = bgLayerRef.current;
    if (!layer) return;

    if (artUrl === prevArtUrlRef.current) return;

    if (!artUrl) {
      if (prevArtUrlRef.current === null) return;
      layer.style.transition = 'opacity 1.5s ease-in-out';
      layer.style.opacity = '0';
      return;
    }

    if (!prevArtUrlRef.current) {
      prevArtUrlRef.current = artUrl;
      layer.style.transition = 'none';
      layer.style.backgroundImage = `url(${JSON.stringify(artUrl)})`;
      void layer.offsetHeight;
      layer.style.transition = 'opacity 1.5s ease-in-out';
      layer.style.opacity = '1';
      return;
    }

    prevArtUrlRef.current = artUrl;

    layer.style.transition = 'opacity 1.5s ease-in-out';
    layer.style.opacity = '0';

    const swapTimer = setTimeout(() => {
      layer.style.transition = 'none';
      layer.style.backgroundImage = `url(${JSON.stringify(artUrl)})`;
      void layer.offsetHeight;
      layer.style.transition = 'opacity 1.5s ease-in-out';
      layer.style.opacity = '1';
    }, 750);

    return () => {
      clearTimeout(swapTimer);
      layer.style.transition = 'none';
    };
  }, [artUrl]);

  React.useEffect(() => {
    const restored = loadRadioState();
    setVolume(restored.volume);
    setQuality(restored.quality);
    setChannel(normalizeChannel(restored.channel));
    setPlaybackDesired(restored.playing);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    const applySharedState = (detail: RadioStateChangeDetail) => {
      if (detail.value === null) {
        return;
      }

      if (detail.key === MIDORIAI_RADIO_VOLUME_KEY) {
        setVolume(clampVolume(Number(detail.value)));
        return;
      }

      if (detail.key === MIDORIAI_RADIO_QUALITY_KEY) {
        setQuality(normalizeQuality(detail.value));
        return;
      }

      if (detail.key === MIDORIAI_RADIO_CHANNEL_KEY) {
        setChannel(normalizeChannel(detail.value));
        return;
      }

      if (detail.key === MIDORIAI_RADIO_PLAYING_KEY) {
        setPlaybackDesired(detail.value === 'true');
      }
    };

    const handleStateEvent = (event: Event) => {
      const detail = (event as CustomEvent<RadioStateChangeDetail>).detail;
      if (detail) {
        applySharedState(detail);
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === null) {
        return;
      }
      applySharedState({ key: event.key, value: event.newValue });
    };

    window.addEventListener(MIDORIAI_RADIO_STATE_EVENT, handleStateEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(MIDORIAI_RADIO_STATE_EVENT, handleStateEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveRadioVolume(volume);
  }, [hydrated, volume]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveRadioQuality(quality);
  }, [hydrated, quality]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveRadioChannel(channel);
  }, [channel, hydrated]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveRadioPlaying(playbackDesired);
  }, [hydrated, playbackDesired]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (audio !== null) {
      audio.volume = clampVolume(volume);
    }
  }, [volume]);

  const syncProgress = React.useCallback((payload: CurrentPayload) => {
    const duration = Math.max(0, payload.duration_ms);
    const position = clampProgress(payload.position_ms, duration);

    progressSnapshotRef.current = {
      positionMs: position,
      durationMs: duration,
      updatedAtMs: Date.now(),
    };

    setDurationMs(duration);
    setPositionMs(position);
  }, []);

  const refreshCurrent = React.useCallback(
    async (selectedChannel: string) => {
      const requestId = currentRequestRef.current + 1;
      currentRequestRef.current = requestId;

      try {
        const payload = await fetchCurrent(selectedChannel);

        if (currentRequestRef.current !== requestId) {
          return;
        }

        setCurrentTrack(payload);
        syncProgress(payload);
        setLastError(null);
      } catch (error) {
        if (currentRequestRef.current !== requestId) {
          return;
        }
        setLastError(toErrorMessage(error));
      }
    },
    [syncProgress],
  );

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    const selectedChannel = normalizeChannel(channel);

    void refreshCurrent(selectedChannel);
    const intervalId = window.setInterval(() => {
      void refreshCurrent(selectedChannel);
    }, CURRENT_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [channel, hydrated, refreshCurrent]);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      const snapshot = progressSnapshotRef.current;
      if (snapshot.durationMs <= 0) {
        setPositionMs(0);
        return;
      }

      const elapsedMs = Date.now() - snapshot.updatedAtMs;
      setPositionMs(clampProgress(snapshot.positionMs + elapsedMs, snapshot.durationMs));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    let active = true;

    const loadChannels = async () => {
      try {
        const payload = await fetchChannels();
        if (!active) {
          return;
        }

        const sortedChannels = [...payload.channels].sort((a, b) => a.name.localeCompare(b.name));
        setChannels(sortedChannels);

        const activeChannel = normalizeChannel(channelRef.current);
        if (!sortedChannels.some((entry) => entry.name === activeChannel)) {
          setChannel('all');
        }
      } catch (error) {
        if (active) {
          setLastError(toErrorMessage(error));
        }
      }
    };

    void loadChannels();

    return () => {
      active = false;
    };
  }, [hydrated]);

  React.useEffect(() => {
    if (!hydrated || currentTrackId === null) {
      setArtMetadata(null);
      setArtUrl(null);
      return;
    }

    const requestId = artRequestRef.current + 1;
    artRequestRef.current = requestId;
    const requestedChannel = normalizeChannel(channel);
    const requestedTrackId = currentTrackId;

    const loadArt = async () => {
      try {
        const payload = await fetchArt(requestedChannel);

        if (artRequestRef.current !== requestId) {
          return;
        }

        setArtMetadata(payload);

        const nextArtUrl =
          payload.has_art && payload.track_id === requestedTrackId
            ? appendTrackCacheKey(payload.art_url.trim(), payload.track_id)
            : null;
        setArtUrl(nextArtUrl && nextArtUrl.length > 0 ? nextArtUrl : null);
      } catch {
        if (artRequestRef.current !== requestId) {
          return;
        }
        setArtMetadata(null);
        setArtUrl(null);
      }
    };

    void loadArt();
  }, [channel, currentTrackId, hydrated]);

  React.useEffect(() => {
    if (!artUrl) {
      setArtPalette(null);
      return;
    }

    let cancelled = false;

    const paletteUrl = `/api/radio/palette?url=${encodeURIComponent(artUrl)}`;

    fetch(paletteUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Palette API returned ${res.status}`);
        return res.json() as Promise<ExtractedPalette>;
      })
      .then((palette) => {
        if (!cancelled) {
          setArtPalette(palette);
        }
      })
      .catch(() => {
        // fallback handled by BlobProgressBar
      });

    return () => {
      cancelled = true;
    };
  }, [artUrl]);

  React.useEffect(() => {
    if (!hydrated || currentTrackId === null) {
      setProbeData(null);
      setProbeLoading(false);
      return;
    }

    setProbeData(null);
    setProbeLoading(true);

    const controller = new AbortController();
    const requestedChannel = normalizeChannel(channel);
    const timeoutId = window.setTimeout(() => {
      const loadProbe = async () => {
        try {
          const response = await fetch(
            `/api/radio/probe?channel=${encodeURIComponent(requestedChannel)}`,
            {
              cache: 'no-store',
              signal: controller.signal,
            },
          );

          if (!response.ok) {
            throw new Error(`Probe request failed: ${response.status}`);
          }

          const payload = (await response.json()) as ProbeMetadata;
          if (controller.signal.aborted) {
            return;
          }

          setProbeData(payload.ok ? payload : null);
        } catch {
          if (!controller.signal.aborted) {
            setProbeData(null);
          }
        } finally {
          if (!controller.signal.aborted) {
            setProbeLoading(false);
          }
        }
      };

      void loadProbe();
    }, PROBE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [channel, currentTrackId, hydrated]);

  const startPlayback = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio === null) {
      return;
    }

    setPlaybackDesired(true);
    playbackDesiredRef.current = true;

    const streamUrl = buildStreamUrl({
      channel: channelRef.current,
      quality: qualityRef.current,
      baseUrl: '',
      path: '/api/radio/stream',
      cacheBust: true,
    });

    setStreamState('loading');

    audio.src = `${streamUrl}&restart=${restartNonceRef.current}`;
    audio.load();
    audio.play().catch((error: DOMException) => {
      if (error.name === 'NotAllowedError') {
        setStreamState('error');
        setPlaybackDesired(false);
        playbackDesiredRef.current = false;
        setLastError('Playback blocked by browser. Press play to retry.');
      }
    });
  }, []);

  const stopPlayback = React.useCallback(() => {
    setPlaybackDesired(false);
    playbackDesiredRef.current = false;

    const audio = audioRef.current;
    if (audio !== null) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    setStreamState('idle');
  }, []);

  React.useEffect(() => {
    startPlaybackRef.current = startPlayback;
  }, [startPlayback]);

  React.useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = clampVolume(volumeRef.current);
    audioRef.current = audio;

    const handlePlaying = () => {
      setStreamState('playing');
      setLastError(null);
    };

    const handleWaiting = () => {
      if (playbackDesiredRef.current) {
        setStreamState('loading');
      }
    };

    const handleEnded = () => {
      if (playbackDesiredRef.current) {
        setRestartNonce((previous) => previous + 1);
      }
    };

    const handleError = () => {
      if (!playbackDesiredRef.current) {
        return;
      }

      setStreamState('error');
      setLastError('Stream playback error. Press play to retry.');
      setPlaybackDesired(false);
      playbackDesiredRef.current = false;
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!playbackDesired || restartNonce === 0) {
      return;
    }

    startPlaybackRef.current();
  }, [playbackDesired, restartNonce]);

  React.useEffect(() => {
    const isPlaying = playbackDesired && streamState === 'playing';

    if (!hydrated || !isPlaying) {
      if (heartbeatIntervalRef.current !== null) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (sessionIdRef.current !== null && !isPlaying) {
        void sendHeartbeat(sessionIdRef.current, channelRef.current, true).catch(() => undefined);
        sessionIdRef.current = null;
        setListenerCount(null);
      }
      return;
    }

    if (sessionIdRef.current === null) {
      sessionIdRef.current = createSessionId();
    }

    const sessionId = sessionIdRef.current;
    const tick = () => {
      void sendHeartbeat(sessionId, channelRef.current)
        .then((result) => {
          setListenerCount(result.count);
        })
        .catch(() => undefined);
    };

    tick();
    heartbeatIntervalRef.current = setInterval(tick, HEARTBEAT_MS);

    return () => {
      if (heartbeatIntervalRef.current !== null) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [hydrated, playbackDesired, streamState]);

  React.useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current !== null) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (sessionIdRef.current !== null) {
        void sendHeartbeat(sessionIdRef.current, channelRef.current, true).catch(() => undefined);
        sessionIdRef.current = null;
      }
    };
  }, []);

  const togglePlayback = React.useCallback(() => {
    if (playbackDesiredRef.current) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [startPlayback, stopPlayback]);

  const cycleQuality = React.useCallback(() => {
    const levels: QualityName[] = ['low', 'medium', 'high'];
    const idx = levels.indexOf(quality);
    const next = levels[(idx + 1) % levels.length];
    if (next === undefined) return;
    setQuality(next);
  }, [quality]);

  const navigateChannel = React.useCallback(
    (direction: -1 | 1) => {
      const list = channels.length > 0 ? channels : DEFAULT_CHANNELS;
      const idx = list.findIndex((c) => c.name === channel);
      if (idx < 0) return;
      const next = list[(idx + direction + list.length) % list.length];
      if (next === undefined) return;
      setChannel(next.name);
    },
    [channel, channels],
  );

  const clearVolLeaveTimer = React.useCallback(() => {
    if (volLeaveTimerRef.current !== null) {
      clearTimeout(volLeaveTimerRef.current);
      volLeaveTimerRef.current = null;
    }
  }, []);

  const channelOptions = channels.length > 0 ? channels : DEFAULT_CHANNELS;
  const isPlaying = streamState === 'playing';
  const progressValue = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
  const artist = probeData?.artist?.trim() || 'Midori AI';
  const title = currentTrack?.title ?? 'Finding current track…';
  const streamStateLabel = getStreamStateLabel(streamState);

  const volumeDots = React.useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: `vdot${i}`,
        active: i <= Math.round(volume * 9),
      })),
    [volume],
  );

  const staticGradient =
    'radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.34), transparent 30%), radial-gradient(circle at 80% 12%, rgba(45, 212, 191, 0.18), transparent 26%), linear-gradient(135deg, #05040a 0%, #151025 45%, #05040a 100%)';

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: staticGradient,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          pointerEvents: 'none',
        }}
      />
      <Box
        ref={bgLayerRef}
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.32) saturate(1.08)',
          transform: 'scale(1.12)',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background:
            'linear-gradient(180deg, rgba(5,4,10,0.28) 0%, rgba(5,4,10,0.58) 44%, rgba(5,4,10,0.86) 100%)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pb: { xs: '130px', md: '72px' },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            px: { xs: 2, md: 4 },
            pt: { xs: 4, md: 5 },
            pb: 1,
            minHeight: 52,
          }}
        >
          <Radio size={18} />
          <Typography
            level="body-sm"
            sx={{ color: 'text.secondary', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            Midori AI Radio
          </Typography>
          <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
            ·
          </Typography>
          <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
            Listening Room
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}
        >
          <Box
            sx={{
              flex: { md: '0 0 50%' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: { xs: 2, md: 3 },
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {artUrl ? (
              <Box
                key={artUrl}
                component="img"
                src={artUrl}
                alt=""
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  animation: `${coverSlideIn} 0.4s ease-out`,
                }}
              />
            ) : (
              <Music key="placeholder" size={64} aria-hidden />
            )}
          </Box>

          <Stack
            sx={{
              flex: 1,
              overflow: 'hidden',
              p: { xs: 2, md: 3 },
              pt: { xs: 0, md: 3 },
              minWidth: 0,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              {listenerCount !== null && (
                <>
                  <Users size={14} />
                  <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                    {listenerCount}
                  </Typography>
                  <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                    ·
                  </Typography>
                </>
              )}
              <Typography
                level="h3"
                sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' }, lineHeight: 1.3 }}
              >
                {title}
              </Typography>
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                ·
              </Typography>
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                {artist}
              </Typography>
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                ·
              </Typography>
              <Chip
                size="sm"
                variant="soft"
                color={isPlaying ? 'success' : streamState === 'error' ? 'danger' : 'neutral'}
                sx={{ borderRadius: 0, '--Chip-minHeight': '22px', minHeight: 22 }}
              >
                {streamStateLabel}
              </Chip>
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                ·
              </Typography>
              <Box
                component="select"
                aria-label="Radio channel"
                value={channel}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                  setChannel(normalizeChannel(event.target.value));
                }}
                sx={{
                  borderRadius: 0,
                  width: 'fit-content',
                  minWidth: 100,
                  minHeight: 28,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(9, 10, 18, 0.64)',
                  color: 'text.primary',
                  px: 0.5,
                  fontSize: '0.75rem',
                  outline: 'none',
                  '&:focus-visible': {
                    borderColor: 'primary.400',
                    boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.35)',
                  },
                  '& option': {
                    backgroundColor: '#10111a',
                    color: '#f2f2f4',
                  },
                }}
              >
                {channelOptions.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name} ({entry.track_count})
                  </option>
                ))}
              </Box>
            </Stack>

            {lastError && (
              <Typography level="body-sm" sx={{ color: 'danger.300', mt: 0.5 }}>
                {lastError}
              </Typography>
            )}

            <Sheet
              variant="outlined"
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                flex: 1,
                mt: 2,
                minHeight: 0,
                bgcolor: 'rgba(10,12,18,0.4)',
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: 0,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                <Typography
                  level="body-sm"
                  sx={{
                    color: 'text.tertiary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Track Story
                </Typography>
              </Box>
              <Box
                key={currentTrackId ?? 'idle'}
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  px: 2,
                  pb: 2,
                  minHeight: 0,
                  animation: `${fadeIn} 0.35s ease-out`,
                }}
              >
                {probeData?.comment?.trim() ? (
                  <Typography
                    level="body-sm"
                    sx={{
                      color: 'text.secondary',
                      whiteSpace: 'pre-wrap',
                      fontSize: { xs: '0.875rem' },
                    }}
                  >
                    {probeData.comment.trim()}
                  </Typography>
                ) : probeLoading ? (
                  <Stack spacing={1}>
                    <Skeleton variant="text" width="90%" />
                    <Skeleton variant="text" width="75%" />
                    <Skeleton variant="text" width="85%" />
                    <Skeleton variant="text" width="60%" />
                  </Stack>
                ) : (
                  <Typography
                    level="body-sm"
                    sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem' } }}
                  >
                    Track story metadata will appear here when the stream publishes it.
                  </Typography>
                )}
              </Box>
            </Sheet>
          </Stack>
        </Stack>
      </Box>

      <Sheet
        variant="outlined"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderColor: 'rgba(255,255,255,0.12)',
          bgcolor: 'rgba(8,8,14,0.92)',
          backdropFilter: 'blur(24px)',
          borderWidth: '1px 0 0 0',
          borderRadius: 0,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 0.25, md: 2 }}
          alignItems="center"
          sx={{ px: { xs: 2, md: 3 }, py: { xs: 0.75, md: 1 } }}
        >
          <Box
            onClick={cycleQuality}
            role="button"
            tabIndex={0}
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') cycleQuality();
            }}
            aria-label={`Quality: ${quality}, click to cycle`}
            sx={{
              cursor: 'pointer',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.400',
                outlineOffset: 2,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 20 }}>
              <Box
                sx={{
                  width: 4,
                  height: 6,
                  bgcolor:
                    quality === 'low' || quality === 'medium' || quality === 'high'
                      ? 'primary.400'
                      : 'rgba(255,255,255,0.15)',
                }}
              />
              <Box
                sx={{
                  width: 4,
                  height: 12,
                  bgcolor:
                    quality === 'medium' || quality === 'high'
                      ? 'primary.400'
                      : 'rgba(255,255,255,0.15)',
                }}
              />
              <Box
                sx={{
                  width: 4,
                  height: 18,
                  bgcolor: quality === 'high' ? 'primary.400' : 'rgba(255,255,255,0.15)',
                }}
              />
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, maxWidth: '80%' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <BlobProgressBar
                value={Math.min(100, Math.max(0, progressValue))}
                isPlaying={isPlaying}
                palette={artPalette}
                height={20}
              />
              <Typography
                level="body-xs"
                sx={{
                  minWidth: 42,
                  textAlign: 'right',
                  color: 'text.secondary',
                }}
              >
                {formatTime(positionMs)}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button
              size="sm"
              variant="plain"
              color="neutral"
              onClick={() => navigateChannel(-1)}
              aria-label="Previous channel"
              sx={{ minWidth: 44, minHeight: 44, borderRadius: 0 }}
            >
              <StepBack size={18} />
            </Button>

            <Button
              size="sm"
              variant="soft"
              color={isPlaying ? 'success' : 'primary'}
              onClick={togglePlayback}
              aria-label={playbackDesired ? 'Pause Midori AI Radio' : 'Play Midori AI Radio'}
              sx={{ minWidth: 44, minHeight: 44, borderRadius: 0 }}
            >
              {playbackDesired ? <Pause size={18} /> : <Play size={18} />}
            </Button>

            <Button
              size="sm"
              variant="plain"
              color="neutral"
              onClick={() => navigateChannel(1)}
              aria-label="Next channel"
              sx={{ minWidth: 44, minHeight: 44, borderRadius: 0 }}
            >
              <StepForward size={18} />
            </Button>

            <Box
              onMouseEnter={() => {
                clearVolLeaveTimer();
                setVolHovered(true);
              }}
              onMouseLeave={() => {
                clearVolLeaveTimer();
                volLeaveTimerRef.current = setTimeout(() => setVolHovered(false), 400);
              }}
              sx={{
                position: 'relative',
                width: 210,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: 28,
                  opacity: volHovered ? 1 : 0,
                  transition: 'opacity 0.2s ease, transform 0.25s ease',
                  transitionDelay: volHovered ? '0.1s' : '0.3s',
                  transform: volHovered ? 'translateX(0)' : 'translateX(110px)',
                  mr: '10px',
                }}
              >
                {volumeDots.map((dot, i) => (
                  <Box
                    key={dot.id}
                    onClick={() => {
                      setVolume(clampVolume(i / 9));
                    }}
                    role="button"
                    aria-label={`Volume ${Math.round((i / 9) * 100)}%`}
                    tabIndex={volHovered ? 0 : -1}
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: dot.active ? 'primary.400' : 'rgba(255,255,255,0.18)',
                      cursor: 'pointer',
                      minWidth: 10,
                      minHeight: 10,
                    }}
                  />
                ))}
              </Box>

              <Volume2
                size={20}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (volume < 0.1) {
                    setVolume(0.5);
                  } else {
                    setVolume(0);
                  }
                }}
              />
            </Box>
          </Stack>
        </Stack>
      </Sheet>
    </Box>
  );
}
