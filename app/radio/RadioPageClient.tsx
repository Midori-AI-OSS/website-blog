'use client';

import { keyframes } from '@emotion/react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import ButtonGroup from '@mui/joy/ButtonGroup';
import Chip from '@mui/joy/Chip';
import LinearProgress from '@mui/joy/LinearProgress';
import Sheet from '@mui/joy/Sheet';
import Skeleton from '@mui/joy/Skeleton';
import Slider from '@mui/joy/Slider';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Music, Pause, Play, Radio, Users, Volume2 } from 'lucide-react';
import * as React from 'react';
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
  QUALITY_LEVELS,
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
  const [artMetadata, setArtMetadata] = React.useState<ArtPayload | null>(null);
  const [artUrl, setArtUrl] = React.useState<string | null>(null);
  const [displayedArtUrl, setDisplayedArtUrl] = React.useState<string | null>(null);
  const [staleBgUrl, setStaleBgUrl] = React.useState<string | null>(null);
  const [bgFading, setBgFading] = React.useState(false);
  const [probeData, setProbeData] = React.useState<ProbeMetadata | null>(null);
  const [probeLoading, setProbeLoading] = React.useState(false);
  const [positionMs, setPositionMs] = React.useState(0);
  const [durationMs, setDurationMs] = React.useState(0);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const currentTrackId = currentTrack?.track_id ?? null;

  React.useEffect(() => {
    if (artUrl) {
      setDisplayedArtUrl(artUrl);
    }
  }, [artUrl]);

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
    const next = artUrl ? `url(${JSON.stringify(artUrl)})` : null;
    const current = prevArtUrlRef.current;

    if (next === current) {
      return;
    }

    if (!next) {
      setStaleBgUrl(null);
      setBgFading(false);
      return;
    }

    if (!current) {
      prevArtUrlRef.current = next;
      setStaleBgUrl(null);
      setBgFading(false);
      return;
    }

    prevArtUrlRef.current = next;
    setStaleBgUrl(current);
    requestAnimationFrame(() => {
      setBgFading(true);
    });

    const timer = setTimeout(() => {
      setStaleBgUrl(null);
      setBgFading(false);
    }, 1600);

    return () => {
      clearTimeout(timer);
      setStaleBgUrl(null);
      setBgFading(false);
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

  const channelOptions = channels.length > 0 ? channels : DEFAULT_CHANNELS;
  const isPlaying = streamState === 'playing';
  const progressValue = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
  const artist = probeData?.artist?.trim() || 'Midori AI';
  const title = currentTrack?.title ?? 'Finding current track…';
  const streamStateLabel = getStreamStateLabel(streamState);

  const staleBackgroundImage = staleBgUrl ?? 'none';
  const activeArtUrl = artUrl ?? displayedArtUrl;
  const artBackgroundImage = activeArtUrl ? `url(${JSON.stringify(activeArtUrl)})` : 'none';
  const staticGradient =
    'radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.34), transparent 30%), radial-gradient(circle at 80% 12%, rgba(45, 212, 191, 0.18), transparent 26%), linear-gradient(135deg, #05040a 0%, #151025 45%, #05040a 100%)';

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'clip',
      }}
    >
      {staleBgUrl && (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            backgroundImage: staleBackgroundImage,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(0.32) saturate(1.08)',
            transform: 'scale(1.12)',
            pointerEvents: 'none',
            opacity: bgFading ? 0 : 1,
            transition: 'opacity 1.5s ease-in-out',
          }}
        />
      )}
      {activeArtUrl ? (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            backgroundImage: artBackgroundImage,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(40px) brightness(0.32) saturate(1.08)',
            transform: 'scale(1.12)',
            pointerEvents: 'none',
            opacity: staleBgUrl ? (bgFading ? 1 : 0) : undefined,
            transition: staleBgUrl ? 'opacity 1.5s ease-in-out' : 'none',
          }}
        />
      ) : (
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
      )}
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
          width: '100%',
          maxWidth: '1200px',
          mx: 'auto',
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 4, md: 8 },
          pb: { xs: 6, md: 12 },
        }}
      >
        <Stack spacing={1.25} sx={{ mb: { xs: 3, md: 4 } }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Radio size={18} />
            <Typography
              level="body-sm"
              sx={{ color: 'text.secondary', letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              Midori AI Radio
            </Typography>
          </Stack>
          <Typography level="h1" sx={{ fontSize: { xs: '2.25rem', md: '3.5rem' } }}>
            Listening Room
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 3, md: 4 }}
          alignItems="stretch"
        >
          <Sheet
            variant="outlined"
            sx={{
              flex: { md: '0 0 40%' },
              p: { xs: 2, sm: 3 },
              bgcolor: 'rgba(10, 12, 18, 0.42)',
              borderColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(18px)',
              borderRadius: 0,
            }}
          >
            <Stack spacing={3}>
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  bgcolor: 'rgba(10,12,18,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderRadius: 0,
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
                      objectFit: 'cover',
                      animation: `${coverSlideIn} 0.4s ease-out`,
                    }}
                  />
                ) : (
                  <Music key="placeholder" size={64} aria-hidden />
                )}
              </Box>

              <Stack spacing={0.75}>
                <Typography level="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.15rem' } }}>
                  {title}
                </Typography>
                <Typography level="body-md" sx={{ color: 'text.secondary' }}>
                  {artist}
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  {streamStateLabel}
                  {artMetadata?.has_art === false ? ' · art unavailable' : ''}
                </Typography>
              </Stack>

              <Stack spacing={1}>
                <LinearProgress
                  determinate
                  value={Math.min(100, Math.max(0, progressValue))}
                  thickness={8}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'primary.400',
                    borderRadius: 0,
                    '--LinearProgress-radius': '0px',
                  }}
                />
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                    {formatTime(positionMs)}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                    {formatTime(durationMs)}
                  </Typography>
                </Stack>
              </Stack>

              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                  <Button
                    size="lg"
                    color={isPlaying ? 'success' : 'primary'}
                    onClick={togglePlayback}
                    aria-label={playbackDesired ? 'Pause Midori AI Radio' : 'Play Midori AI Radio'}
                    sx={{
                      minWidth: { xs: '100%', sm: 56 },
                      minHeight: 56,
                      borderRadius: 0,
                    }}
                  >
                    {playbackDesired ? <Pause size={24} /> : <Play size={24} />}
                  </Button>

                  <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    sx={{ width: '100%', minHeight: 44 }}
                  >
                    <Volume2 size={20} aria-hidden />
                    <Slider
                      aria-label="Radio volume"
                      value={volume}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(_, nextValue) => {
                        const numeric = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                        if (typeof numeric === 'number') {
                          setVolume(clampVolume(numeric));
                        }
                      }}
                      sx={{
                        minHeight: 44,
                        '--Slider-thumbRadius': '0px',
                        '--Slider-trackSize': '4px',
                        '--Slider-thumbSize': '18px',
                        borderRadius: 0,
                        '& input': {
                          minWidth: 44,
                          minHeight: 44,
                        },
                      }}
                    />
                  </Stack>
                </Stack>

                <Stack spacing={0.75}>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    Channel
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
                      width: '100%',
                      minHeight: 44,
                      border: '1px solid rgba(255,255,255,0.22)',
                      background: 'rgba(9, 10, 18, 0.74)',
                      color: 'text.primary',
                      px: 1.5,
                      fontSize: '1rem',
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

                <Stack spacing={0.75}>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    Quality
                  </Typography>
                  <ButtonGroup
                    size="sm"
                    sx={{
                      width: '100%',
                      '--ButtonGroup-radius': '0px',
                    }}
                  >
                    {QUALITY_LEVELS.map((entry) => (
                      <Button
                        key={entry.name}
                        variant={quality === entry.name ? 'solid' : 'outlined'}
                        color={quality === entry.name ? 'primary' : 'neutral'}
                        onClick={() => setQuality(entry.name)}
                        sx={{
                          flex: 1,
                          minHeight: 44,
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {entry.name}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Stack>
              </Stack>

              {listenerCount !== null && (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ color: 'text.tertiary' }}
                >
                  <Typography level="body-sm" sx={{ color: 'inherit' }}>
                    {listenerCount}
                  </Typography>
                  <Users size={16} aria-hidden />
                </Stack>
              )}

              {lastError && (
                <Typography level="body-sm" sx={{ color: 'danger.300' }}>
                  {lastError}
                </Typography>
              )}
            </Stack>
          </Sheet>

          <Stack spacing={4} sx={{ flex: 1, minWidth: 0 }}>
            <Sheet
              variant="outlined"
              sx={{
                bgcolor: 'rgba(10,12,18,0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                p: { xs: 3, md: 4 },
                borderRadius: 0,
              }}
            >
              <Stack spacing={2}>
                <Typography level="h4">Track Story</Typography>
                <Box key={currentTrackId ?? 'idle'} sx={{ animation: `${fadeIn} 0.35s ease-out` }}>
                  {probeData?.comment?.trim() ? (
                    <Typography
                      level="body-md"
                      sx={{
                        color: 'text.secondary',
                        whiteSpace: 'pre-wrap',
                        fontSize: { xs: '1rem' },
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
                      level="body-md"
                      sx={{ color: 'text.secondary', fontSize: { xs: '1rem' } }}
                    >
                      Track story metadata will appear here when the stream publishes it.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Sheet>

            <Sheet
              variant="outlined"
              sx={{
                bgcolor: 'rgba(10,12,18,0.5)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                p: { xs: 3, md: 4 },
                borderRadius: 0,
              }}
            >
              <Stack spacing={2.5}>
                <Stack spacing={0.5}>
                  <Typography level="h4">Channels</Typography>
                  <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                    Browse the station lanes and switch the room instantly.
                  </Typography>
                </Stack>
                <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                  {channelOptions.map((entry) => (
                    <Chip
                      key={entry.name}
                      variant={entry.name === channel ? 'solid' : 'soft'}
                      color={entry.name === channel ? 'primary' : 'neutral'}
                      onClick={() => setChannel(entry.name)}
                      role="button"
                      tabIndex={0}
                      sx={{
                        minHeight: 46,
                        '--Chip-minHeight': '46px',
                        px: 1.5,
                        borderRadius: 0,
                        border: '1px solid rgba(255,255,255,0.08)',
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.400',
                          outlineOffset: 2,
                        },
                      }}
                    >
                      {entry.name} ({entry.track_count})
                    </Chip>
                  ))}
                </Stack>
              </Stack>
            </Sheet>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
