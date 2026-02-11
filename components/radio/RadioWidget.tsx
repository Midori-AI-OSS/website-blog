'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import ButtonGroup from '@mui/joy/ButtonGroup';
import Option from '@mui/joy/Option';
import Select from '@mui/joy/Select';
import Sheet from '@mui/joy/Sheet';
import Slider from '@mui/joy/Slider';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Music, Pin, PinOff, Play, Square } from 'lucide-react';
import {
  buildStreamUrl,
  fetchArt,
  fetchChannels,
  fetchCurrent,
  RadioApiError,
} from '@/lib/radio/client';
import type { ArtPayload, ChannelEntry, CurrentPayload, QualityName } from '@/lib/radio/contract';
import { normalizeChannel, QUALITY_LEVELS } from '@/lib/radio/contract';
import type { RadioImageInventory } from '@/lib/radio/images';
import { pickDeterministicImage, preloadImage } from '@/lib/radio/images';
import {
  clearRadioLastError,
  loadRadioState,
  saveRadioChannel,
  saveRadioLastError,
  saveRadioOpen,
  saveRadioQuality,
  saveRadioVolume,
} from '@/lib/radio/state';

const PLACEHOLDER_IMAGE = '/blog/placeholder.png';
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const;
const HOVER_CLOSE_LINGER_MS = 3000;

type StreamState = 'idle' | 'connecting' | 'playing' | 'retrying' | 'error';
type BackdropSource = 'placeholder' | 'server' | 'fallback';

function getRetryDelayMs(attempt: number): number {
  const index = Math.min(attempt, RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[index] ?? 30000;
}

function addMediaListener(query: MediaQueryList, listener: () => void): () => void {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }

  const legacyQuery = query as MediaQueryList & {
    addListener?: (callback: (event: MediaQueryListEvent) => void) => void;
    removeListener?: (callback: (event: MediaQueryListEvent) => void) => void;
  };

  if (typeof legacyQuery.addListener === 'function') {
    const legacyListener = () => listener();
    legacyQuery.addListener(legacyListener);
    return () => legacyQuery.removeListener?.(legacyListener);
  }

  return () => undefined;
}

function useDesktopEligibility(minWidth: number = 1024): boolean {
  const [eligible, setEligible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const widthQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
    const hoverQuery = window.matchMedia('(hover: hover)');
    const pointerQuery = window.matchMedia('(pointer: fine)');

    const update = () => {
      setEligible(widthQuery.matches && hoverQuery.matches && pointerQuery.matches);
    };

    update();

    const cleanup = [
      addMediaListener(widthQuery, update),
      addMediaListener(hoverQuery, update),
      addMediaListener(pointerQuery, update),
    ];

    window.addEventListener('resize', update);

    return () => {
      cleanup.forEach((fn) => fn());
      window.removeEventListener('resize', update);
    };
  }, [minWidth]);

  return eligible;
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

export default function RadioWidget() {
  const desktopEligible = useDesktopEligibility();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const retryTimerRef = React.useRef<number | null>(null);
  const closeLingerTimerRef = React.useRef<number | null>(null);
  const retryAttemptRef = React.useRef(0);
  const reconnectRef = React.useRef<() => Promise<void>>(async () => undefined);
  const playbackDesiredRef = React.useRef(false);
  const qualityRef = React.useRef<QualityName>('medium');
  const channelRef = React.useRef('all');
  const metadataRequestRef = React.useRef(0);
  const initializedChannelRef = React.useRef(false);

  const [hydrated, setHydrated] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [closeLingerActive, setCloseLingerActive] = React.useState(false);
  const [stickyOpen, setStickyOpen] = React.useState(false);
  const [volume, setVolume] = React.useState(0.5);
  const [isAdjustingVolume, setIsAdjustingVolume] = React.useState(false);
  const [quality, setQuality] = React.useState<QualityName>('medium');
  const [channel, setChannel] = React.useState('all');
  const [playbackDesired, setPlaybackDesired] = React.useState(false);
  const [streamState, setStreamState] = React.useState<StreamState>('idle');
  const [statusText, setStatusText] = React.useState('Idle');
  const [lastError, setLastError] = React.useState<string | null>(null);

  const [channels, setChannels] = React.useState<ChannelEntry[]>([]);
  const [currentTrack, setCurrentTrack] = React.useState<CurrentPayload | null>(null);
  const [artMetadata, setArtMetadata] = React.useState<ArtPayload | null>(null);
  const [imageInventory, setImageInventory] = React.useState<RadioImageInventory | null>(null);
  const [backdropUrl, setBackdropUrl] = React.useState(PLACEHOLDER_IMAGE);
  const [backdropSource, setBackdropSource] = React.useState<BackdropSource>('placeholder');

  React.useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  React.useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  React.useEffect(() => {
    playbackDesiredRef.current = playbackDesired;
  }, [playbackDesired]);

  React.useEffect(() => {
    const restored = loadRadioState();
    setStickyOpen(restored.open);
    setVolume(restored.volume);
    setQuality(restored.quality);
    setChannel(normalizeChannel(restored.channel));
    setLastError(restored.lastError);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveRadioOpen(stickyOpen);
  }, [stickyOpen, hydrated]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveRadioQuality(quality);
  }, [quality, hydrated]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveRadioChannel(channel);
  }, [channel, hydrated]);

  React.useEffect(() => {
    const clamped = Math.min(1, Math.max(0, volume));
    if (audioRef.current !== null) {
      audioRef.current.volume = clamped;
    }

    if (!hydrated) {
      return;
    }

    saveRadioVolume(clamped);
  }, [volume, hydrated]);

  const clearRetryTimer = React.useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearCloseLingerTimer = React.useCallback(() => {
    if (closeLingerTimerRef.current !== null) {
      window.clearTimeout(closeLingerTimerRef.current);
      closeLingerTimerRef.current = null;
    }
  }, []);

  const startCloseLinger = React.useCallback(() => {
    if (stickyOpen) {
      return;
    }

    clearCloseLingerTimer();
    setCloseLingerActive(true);
    closeLingerTimerRef.current = window.setTimeout(() => {
      closeLingerTimerRef.current = null;
      setCloseLingerActive(false);
    }, HOVER_CLOSE_LINGER_MS);
  }, [stickyOpen, clearCloseLingerTimer]);

  const handleMouseEnter = React.useCallback(() => {
    clearCloseLingerTimer();
    setCloseLingerActive(false);
    setHovered(true);
  }, [clearCloseLingerTimer]);

  const handleMouseLeave = React.useCallback(() => {
    setHovered(false);
    startCloseLinger();
  }, [startCloseLinger]);

  const scheduleRetry = React.useCallback((reason: string) => {
    if (!playbackDesiredRef.current) {
      return;
    }

    if (retryTimerRef.current !== null) {
      return;
    }

    const delayMs = getRetryDelayMs(retryAttemptRef.current);
    setStreamState('retrying');
    setStatusText(`${reason} Retrying in ${Math.ceil(delayMs / 1000)}s.`);
    setLastError(reason);
    saveRadioLastError(reason);

    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      retryAttemptRef.current += 1;
      void reconnectRef.current();
    }, delayMs);
  }, []);

  const reconnectStream = React.useCallback(async () => {
    if (!playbackDesiredRef.current) {
      return;
    }

    const audio = audioRef.current;
    if (audio === null) {
      return;
    }

    const attempt = retryAttemptRef.current;
    setStreamState(attempt === 0 ? 'connecting' : 'retrying');
    setStatusText(attempt === 0 ? 'Connecting…' : 'Reconnecting…');

    try {
      const streamUrl = buildStreamUrl({
        channel: channelRef.current,
        quality: qualityRef.current,
        cacheBust: true,
      });

      audio.src = streamUrl;
      await audio.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setStreamState('error');
        setStatusText('Playback blocked by browser. Press play to retry.');
        setPlaybackDesired(false);
        playbackDesiredRef.current = false;
        return;
      }

      scheduleRetry(toErrorMessage(error));
    }
  }, [scheduleRetry]);

  React.useEffect(() => {
    reconnectRef.current = reconnectStream;
  }, [reconnectStream]);

  const stopPlayback = React.useCallback(() => {
    setPlaybackDesired(false);
    playbackDesiredRef.current = false;
    retryAttemptRef.current = 0;
    clearRetryTimer();

    const audio = audioRef.current;
    if (audio !== null) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    setStreamState('idle');
    setStatusText('Stopped');
  }, [clearRetryTimer]);

  const startPlayback = React.useCallback(() => {
    setPlaybackDesired(true);
    playbackDesiredRef.current = true;
    retryAttemptRef.current = 0;
    clearRetryTimer();
    void reconnectRef.current();
  }, [clearRetryTimer]);

  React.useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = Math.min(1, Math.max(0, volume));
    audioRef.current = audio;

    const handlePlaying = () => {
      clearRetryTimer();
      retryAttemptRef.current = 0;
      setStreamState('playing');
      setStatusText('Live');
      setLastError(null);
      clearRadioLastError();
    };

    const handlePause = () => {
      if (!playbackDesiredRef.current) {
        setStreamState('idle');
      }
    };

    const handleError = () => {
      if (!playbackDesiredRef.current) {
        return;
      }

      scheduleRetry('Stream interrupted.');
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('stalled', handleError);
    audio.addEventListener('ended', handleError);

    return () => {
      clearRetryTimer();
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('stalled', handleError);
      audio.removeEventListener('ended', handleError);
      audioRef.current = null;
    };
  }, [clearRetryTimer, scheduleRetry]);

  React.useEffect(() => {
    return () => {
      clearCloseLingerTimer();
    };
  }, [clearCloseLingerTimer]);

  React.useEffect(() => {
    if (stickyOpen) {
      clearCloseLingerTimer();
      setCloseLingerActive(false);
    }
  }, [stickyOpen, clearCloseLingerTimer]);

  const refreshMetadata = React.useCallback(async () => {
    const currentRequest = metadataRequestRef.current + 1;
    metadataRequestRef.current = currentRequest;

    try {
      const selectedChannel = normalizeChannel(channelRef.current);
      const [currentPayload, artPayload] = await Promise.all([
        fetchCurrent(selectedChannel),
        fetchArt(selectedChannel),
      ]);

      if (metadataRequestRef.current !== currentRequest) {
        return;
      }

      setCurrentTrack(currentPayload);
      setArtMetadata(artPayload);
      setLastError(null);
      clearRadioLastError();
    } catch (error) {
      const message = toErrorMessage(error);
      setLastError(message);
      saveRadioLastError(message);
    }
  }, []);

  const refreshChannels = React.useCallback(async () => {
    try {
      const payload = await fetchChannels();
      const sortedChannels = [...payload.channels].sort((a, b) => a.name.localeCompare(b.name));
      setChannels(sortedChannels);

      const active = normalizeChannel(channelRef.current);
      const exists = sortedChannels.some((entry) => entry.name === active);
      if (!exists) {
        setChannel('all');
      }
    } catch (error) {
      const message = toErrorMessage(error);
      setLastError(message);
      saveRadioLastError(message);
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    const loadInventory = async () => {
      try {
        const response = await fetch('/api/radio-images', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Image inventory request failed: ${response.status}`);
        }

        const payload = (await response.json()) as RadioImageInventory;
        if (!active) {
          return;
        }

        setImageInventory(payload);
      } catch {
        if (!active) {
          return;
        }

        setImageInventory({
          images: [],
          placeholder: PLACEHOLDER_IMAGE,
          count: 0,
          generated_at: new Date().toISOString(),
        });
      }
    };

    void loadInventory();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    void refreshChannels();

    const intervalId = window.setInterval(() => {
      void refreshChannels();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshChannels, hydrated]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    void refreshMetadata();

    const intervalMs = playbackDesired ? 5000 : 20_000;
    const intervalId = window.setInterval(() => {
      void refreshMetadata();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshMetadata, playbackDesired, hydrated]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!initializedChannelRef.current) {
      initializedChannelRef.current = true;
      return;
    }

    void refreshMetadata();

    if (!playbackDesiredRef.current) {
      return;
    }

    clearRetryTimer();
    retryAttemptRef.current = 0;
    setStatusText('Switching channel…');
    void reconnectRef.current();
  }, [channel, refreshMetadata, clearRetryTimer, hydrated]);

  const qualityHint = playbackDesired ? 'Quality change applies on next reconnect/start.' : null;
  const fallbackIdentity = `${currentTrack?.title ?? 'unknown'}::${currentTrack?.track_id ?? 'unknown'}`;
  const fallbackImage = React.useMemo(() => {
    const placeholder = imageInventory?.placeholder ?? PLACEHOLDER_IMAGE;
    const pool = imageInventory?.images ?? [];
    return pickDeterministicImage(pool, fallbackIdentity, placeholder);
  }, [fallbackIdentity, imageInventory]);

  const preferredServerArtUrl = artMetadata?.art_url ?? null;

  React.useEffect(() => {
    let active = true;
    const placeholder = imageInventory?.placeholder ?? PLACEHOLDER_IMAGE;

    setBackdropUrl(placeholder);
    setBackdropSource('placeholder');
    void preloadImage(placeholder);

    const resolveBackdrop = async () => {
      if (preferredServerArtUrl !== null) {
        const serverLoaded = await preloadImage(preferredServerArtUrl);
        if (active && serverLoaded) {
          setBackdropUrl(preferredServerArtUrl);
          setBackdropSource('server');
          return;
        }
      }

      const fallbackLoaded = await preloadImage(fallbackImage);
      if (active && fallbackLoaded) {
        setBackdropUrl(fallbackImage);
        setBackdropSource('fallback');
      }
    };

    void resolveBackdrop();
    return () => {
      active = false;
    };
  }, [preferredServerArtUrl, fallbackImage, imageInventory]);

  const expanded = stickyOpen || hovered || closeLingerActive;

  if (!desktopEligible) {
    return null;
  }

  return (
    <Sheet
      variant="outlined"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 1300,
        width: expanded ? 380 : 56,
        minHeight: expanded ? 68 : 56,
        borderRadius: 0,
        overflow: 'hidden',
        borderColor: 'rgba(255,255,255,0.2)',
        transition: 'width 0.24s ease, box-shadow 0.24s ease, background-color 0.24s ease',
        boxShadow: expanded
          ? '0 24px 64px rgba(0, 0, 0, 0.5)'
          : '0 12px 32px rgba(0, 0, 0, 0.35)',
        backgroundColor: expanded ? 'rgba(8, 8, 14, 0.52)' : 'rgba(8, 8, 14, 0.74)',
        backdropFilter: expanded ? 'blur(24px)' : 'blur(34px)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${backdropUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: expanded ? 0.27 : 0.58,
          filter: expanded ? 'blur(2px) saturate(1.05)' : 'blur(15px) saturate(0.86)',
          transform: expanded ? 'scale(1.04)' : 'scale(1.25)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: expanded
            ? 'linear-gradient(180deg, rgba(8,8,14,0.18) 0%, rgba(8,8,14,0.72) 36%, rgba(8,8,14,0.9) 100%)'
            : 'linear-gradient(180deg, rgba(8,8,14,0.36) 0%, rgba(8,8,14,0.92) 100%)',
          pointerEvents: 'none',
        }}
      />

      {expanded ? (
        <Stack
          spacing={1.1}
          sx={{
            position: 'relative',
            p: 1.25,
            minHeight: 68,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 42 }}>
            <Typography level="title-sm">Midori AI Radio</Typography>
            <Button
              size="sm"
              variant="soft"
              color={streamState === 'playing' ? 'success' : 'neutral'}
              onClick={playbackDesired ? stopPlayback : startPlayback}
              sx={{
                minWidth: 42,
                width: 42,
                height: 42,
                borderRadius: 0,
                px: 0,
              }}
            >
              {playbackDesired ? <Square size={16} /> : <Play size={16} />}
            </Button>
          </Stack>

          <Typography
            level="body-sm"
            sx={{
              fontWeight: 700,
              lineHeight: 1.25,
              minHeight: 36,
              color: 'text.primary',
            }}
          >
            {currentTrack?.title ?? 'Fetching current track…'}
          </Typography>

          <Stack spacing={0.6}>
            {isAdjustingVolume && (
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                Volume {Math.round(volume * 100)}%
              </Typography>
            )}
            <Slider
              value={volume}
              min={0}
              max={1}
              step={0.01}
              onChange={(_, nextValue) => {
                setIsAdjustingVolume(true);
                const numeric = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                if (typeof numeric === 'number') {
                  setVolume(Math.min(1, Math.max(0, numeric)));
                }
              }}
              onChangeCommitted={() => {
                setIsAdjustingVolume(false);
              }}
              onBlur={() => {
                setIsAdjustingVolume(false);
              }}
              sx={{
                '--Slider-thumbRadius': '0px',
                '--Slider-trackSize': '4px',
                '--Slider-thumbSize': '14px',
                borderRadius: 0,
              }}
            />
          </Stack>

          <Stack spacing={0.6}>
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
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}
                >
                  {entry.name}
                </Button>
              ))}
            </ButtonGroup>
          </Stack>

          <Stack spacing={0.6}>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Channel
            </Typography>
            <Select
              value={channel}
              size="sm"
              onChange={(_, value) => {
                if (typeof value === 'string') {
                  setChannel(normalizeChannel(value));
                }
              }}
              sx={{ borderRadius: 0 }}
            >
              {(channels.length > 0 ? channels : [{ name: 'all', track_count: 0 }]).map((entry) => (
                <Option key={entry.name} value={entry.name}>
                  {entry.name} ({entry.track_count})
                </Option>
              ))}
            </Select>
          </Stack>

          {qualityHint !== null && (
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              {qualityHint}
            </Typography>
          )}

          {lastError !== null && (
            <Typography level="body-xs" sx={{ color: '#ffb4b4', fontFamily: 'monospace' }}>
              {lastError}
            </Typography>
          )}

          <Button
            size="sm"
            variant="soft"
            color="neutral"
            startDecorator={stickyOpen ? <PinOff size={14} /> : <Pin size={14} />}
            onClick={() => setStickyOpen((previous) => !previous)}
            sx={{ borderRadius: 0, alignSelf: 'flex-start' }}
          >
            {stickyOpen ? 'Unpin Open' : 'Pin Open'}
          </Button>
        </Stack>
      ) : (
        <Box
          sx={{
            position: 'relative',
            width: 56,
            height: 56,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Box
            component="span"
            sx={{
              width: 24,
              height: 24,
              display: 'grid',
              placeItems: 'center',
              color: streamState === 'playing' ? '#78e08f' : 'rgba(255,255,255,0.92)',
              filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.45))',
            }}
          >
            <Music size={16} />
          </Box>
        </Box>
      )}
    </Sheet>
  );
}
