'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import ButtonGroup from '@mui/joy/ButtonGroup';
import Sheet from '@mui/joy/Sheet';
import Slider from '@mui/joy/Slider';
import Stack from '@mui/joy/Stack';
import Tooltip from '@mui/joy/Tooltip';
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
import { appendTrackCacheKey, pickDeterministicImage, preloadImage } from '@/lib/radio/images';
import {
  clearRadioLastError,
  loadRadioState,
  saveRadioChannel,
  saveRadioLastError,
  saveRadioOpen,
  saveRadioQuality,
  saveRadioVolume,
} from '@/lib/radio/state';
import { useDynamicBackdrop } from '@/components/DynamicBackdropProvider';

const PLACEHOLDER_IMAGE = '/blog/placeholder.png';
const HOVER_CLOSE_LINGER_MS = 3000;
const COLLAPSED_SIZE_PX = 56;
const EXPANDED_WIDTH_PX = 380;
const EXPANDED_HEIGHT_PX = 336;

type StreamState = 'idle' | 'connecting' | 'playing' | 'buffering' | 'error';
type BackdropSource = 'placeholder' | 'server' | 'fallback';

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
  const { setRadioState } = useDynamicBackdrop();
  const desktopEligible = useDesktopEligibility();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const closeLingerTimerRef = React.useRef<number | null>(null);
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
      baseUrl: window.location.origin,
      path: '/api/radio/stream',
      cacheBust: true,
    });

    setStreamState('connecting');
    setStatusText('Connecting…');

    audio.src = streamUrl;
    audio.load();
    audio.play().catch((error: DOMException) => {
      if (error.name === 'NotAllowedError') {
        setStreamState('error');
        setStatusText('Playback blocked by browser. Press play to retry.');
        setPlaybackDesired(false);
        playbackDesiredRef.current = false;
        setLastError('Autoplay blocked by browser');
        saveRadioLastError('Autoplay blocked by browser');
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
    setStatusText('Stopped');
  }, []);

  React.useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = Math.min(1, Math.max(0, volume));
    audioRef.current = audio;

    const handlePlaying = () => {
      setStreamState('playing');
      setStatusText('Live');
      setLastError(null);
      clearRadioLastError();
    };

    const handleWaiting = () => {
      if (playbackDesiredRef.current) {
        setStreamState('buffering');
        setStatusText('Buffering…');
      }
    };

    const handleStreamEnd = () => {
      if (!playbackDesiredRef.current) {
        return;
      }
      setStreamState('error');
      setStatusText('Stream ended. Press play to retry.');
      setLastError('Stream ended');
      saveRadioLastError('Stream ended');
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('error', handleStreamEnd);
    audio.addEventListener('ended', handleStreamEnd);

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('error', handleStreamEnd);
      audio.removeEventListener('ended', handleStreamEnd);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const intervalMs = playbackDesired ? 10_000 : 20_000;
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

    stopPlayback();
    startPlayback();
  }, [channel, refreshMetadata, hydrated, stopPlayback, startPlayback]);

  const fallbackIdentity = `${currentTrack?.title ?? 'unknown'}::${currentTrack?.track_id ?? 'unknown'}`;
  const fallbackImage = React.useMemo(() => {
    const placeholder = imageInventory?.placeholder ?? PLACEHOLDER_IMAGE;
    const pool = imageInventory?.images ?? [];
    return pickDeterministicImage(pool, fallbackIdentity, placeholder);
  }, [fallbackIdentity, imageInventory]);

  const preferredServerArtUrl = React.useMemo(() => {
    if (artMetadata?.has_art !== true) {
      return null;
    }

    const artUrl = artMetadata.art_url.trim();
    if (artUrl.length === 0) {
      return null;
    }

    return appendTrackCacheKey(artUrl, artMetadata.track_id);
  }, [artMetadata?.has_art, artMetadata?.art_url, artMetadata?.track_id]);

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

  React.useEffect(() => {
    setRadioState({
      playing: playbackDesired,
      artUrl: preferredServerArtUrl,
    });

    return () => {
      setRadioState({ playing: false, artUrl: null });
    };
  }, [playbackDesired, preferredServerArtUrl, setRadioState]);

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
        width: expanded ? EXPANDED_WIDTH_PX : COLLAPSED_SIZE_PX,
        height: expanded ? EXPANDED_HEIGHT_PX : COLLAPSED_SIZE_PX,
        borderRadius: 0,
        overflow: 'hidden',
        borderColor: 'rgba(255,255,255,0.2)',
        transformOrigin: 'bottom right',
        transition:
          'width 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.24s ease, background-color 0.24s ease',
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
            height: '100%',
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
            <Tooltip
              open={isAdjustingVolume}
              title={`Volume ${Math.round(volume * 100)}%`}
              placement="top"
              variant="soft"
              arrow
            >
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
                onPointerUp={() => {
                  setIsAdjustingVolume(false);
                }}
                sx={{
                  '--Slider-thumbRadius': '0px',
                  '--Slider-trackSize': '4px',
                  '--Slider-thumbSize': '14px',
                  borderRadius: 0,
                }}
              />
            </Tooltip>
          </Stack>

          <Stack spacing={0.6}>
            <Tooltip
              title="Quality changes apply on next reconnect/start."
              placement="top-start"
              variant="soft"
              arrow
            >
              <Typography level="body-xs" sx={{ color: 'text.tertiary', cursor: 'help', width: 'fit-content' }}>
                Quality
              </Typography>
            </Tooltip>
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
            <Box
              component="select"
              value={channel}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                setChannel(normalizeChannel(event.target.value));
              }}
              sx={{
                borderRadius: 0,
                width: '100%',
                height: 34,
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(9, 10, 18, 0.74)',
                color: 'text.primary',
                px: 1,
                fontSize: '0.875rem',
                outline: 'none',
                '&:focus': {
                  borderColor: 'primary.400',
                },
                '& option': {
                  backgroundColor: '#10111a',
                  color: '#f2f2f4',
                },
              }}
            >
              {(channels.length > 0 ? channels : [{ name: 'all', track_count: 0 }]).map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name} ({entry.track_count})
                </option>
              ))}
            </Box>
          </Stack>

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
            width: COLLAPSED_SIZE_PX,
            height: COLLAPSED_SIZE_PX,
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
