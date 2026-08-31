'use client';

import { keyframes } from '@emotion/react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Sheet from '@mui/joy/Sheet';
import Skeleton from '@mui/joy/Skeleton';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import {
  Eye,
  EyeOff,
  Music,
  Pause,
  Play,
  Radio,
  StepBack,
  StepForward,
  Users,
  Volume2,
} from 'lucide-react';
import * as React from 'react';
import BlobProgressBar from '@/components/radio/BlobProgressBar';
import VibesCanvas from '@/components/radio/VibesCanvas';
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
import { getRadioReconnectDelay } from '@/lib/radio/reconnect';
import {
  loadRadioState,
  MIDORIAI_RADIO_CHANNEL_KEY,
  MIDORIAI_RADIO_PLAYING_KEY,
  MIDORIAI_RADIO_QUALITY_KEY,
  MIDORIAI_RADIO_STATE_EVENT,
  MIDORIAI_RADIO_VIBE_KEY,
  MIDORIAI_RADIO_VOLUME_KEY,
  type RadioStateChangeDetail,
  saveRadioChannel,
  saveRadioPlaying,
  saveRadioQuality,
  saveRadioVibe,
  saveRadioVolume,
} from '@/lib/radio/state';
import { detectEnergy } from '@/lib/radio/vibeHash';
import type { ExtractedPalette } from '@/lib/theme/artPalette';

// ── Lyric section label helpers ──

const SECTION_LABEL_RE = /^\[([^\]]+)\]$/;
const SECTION_LABEL_FALLBACKS = ['#c4b5fd', '#a78bfa', '#818cf8'] as const;

/**
 * Converts text to Title Case, preserving digits and hyphenated segments.
 * e.g. "pre-chorus" → "Pre-Chorus", "verse 1" → "Verse 1"
 */
function toTitleCase(text: string): string {
  return text.toLowerCase().replace(/(?:^|\s|-)\S/g, (match) => match.toUpperCase());
}

/**
 * Deterministic string hash mapping a label to an index 0-2.
 */
function hashLabelToIndex(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 3;
}

function pickPaletteHex(index: number, palette: ExtractedPalette | null): string {
  const idx = ((index % 3) + 3) % 3;
  if (!palette) {
    return SECTION_LABEL_FALLBACKS[idx] ?? SECTION_LABEL_FALLBACKS[0];
  }
  if (idx === 0) return palette.primary;
  if (idx === 1) return palette.secondary;
  return palette.tertiary;
}

const coverSlideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const lyricsEnterRise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const lyricsExitDrop = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
`;

const lyricsFadeOnly = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const lyricsFadeOutOnly = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const borderGlow = keyframes`
  0% { border-color: rgba(139, 92, 246, 0.45); }
  20% { border-color: rgba(139, 92, 246, 0.28); }
  55% { border-color: rgba(139, 92, 246, 0.10); }
  100% { border-color: rgba(255, 255, 255, 0.08); }
`;

type StreamState = 'idle' | 'loading' | 'playing' | 'error';

interface ProbeMetadata {
  ok: boolean;
  artist?: string | null;
  comment?: string | null;
  lyricsEng?: string | null;
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
const CURRENT_REFRESH_MS = 2_000;
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

function fadeAudioVolume(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
): Promise<void> {
  if (durationMs <= 0) {
    audio.volume = to;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = performance.now();
    const step = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      audio.volume = Math.min(1, Math.max(0, from + (to - from) * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

export default function RadioPageClient() {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const reconnectAttemptRef = React.useRef(0);
  const startPlaybackRef = React.useRef<() => void>(() => undefined);
  const channelRef = React.useRef('all');
  const qualityRef = React.useRef<QualityName>('medium');
  const volumeRef = React.useRef(0.5);
  const playbackDesiredRef = React.useRef(false);
  const progressSnapshotRef = React.useRef<ProgressSnapshot>({
    positionMs: 0,
    durationMs: 0,
    updatedAtMs: Date.now(),
  });
  const currentRequestRef = React.useRef(0);
  const currentAbortRef = React.useRef<AbortController | null>(null);
  const artRequestRef = React.useRef(0);
  const artAbortRef = React.useRef<AbortController | null>(null);
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
  const prevChannelRef = React.useRef(channel);
  const restoreInitialRef = React.useRef(true);

  const [channels, setChannels] = React.useState<ChannelEntry[]>([]);
  const [listenerCount, setListenerCount] = React.useState<number | null>(null);
  const [currentTrack, setCurrentTrack] = React.useState<CurrentPayload | null>(null);
  const [_artMetadata, setArtMetadata] = React.useState<ArtPayload | null>(null);
  const [artUrl, setArtUrl] = React.useState<string | null>(null);
  const [artPalette, setArtPalette] = React.useState<ExtractedPalette | null>(null);
  const [showVibes, setShowVibes] = React.useState<boolean>(false);
  const [probeData, setProbeData] = React.useState<ProbeMetadata | null>(null);
  const [probeLoading, setProbeLoading] = React.useState(false);
  const [positionMs, setPositionMs] = React.useState(0);
  const [durationMs, setDurationMs] = React.useState(0);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [volHovered, setVolHovered] = React.useState(false);
  const [mobileVolOpen, setMobileVolOpen] = React.useState(false);
  const volLeaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileVolRef = React.useRef<HTMLDivElement | null>(null);

  // ── Lyrics panel animation state ──
  const LYRICS_ANIM_MS = 350;
  const LYRICS_ANIM_REDUCED_MS = 150;
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [lyricsMounted, setLyricsMounted] = React.useState(false);
  const [lyricsExpanded, setLyricsExpanded] = React.useState(false);
  const [lyricsEnterKey, setLyricsEnterKey] = React.useState(0);
  const [lyricsContent, setLyricsContent] = React.useState<string | null>(null);
  const [lyricsScrollTop, setLyricsScrollTop] = React.useState(false);
  const [lyricsScrollBottom, setLyricsScrollBottom] = React.useState(false);
  const lyricsPhaseRef = React.useRef<'hidden' | 'entering' | 'visible' | 'exiting'>('hidden');
  const lyricsTrackIdRef = React.useRef<string | null>(null);
  const lyricsTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLyricsRef = React.useRef<{ content: string; trackId: string } | null>(null);
  const lyricsScrollRef = React.useRef<HTMLDivElement | null>(null);
  const currentLyricsTargetRef = React.useRef<string | null>(null);

  // ── Vibes fade state ──
  const VIBES_FADE_MS = reducedMotion ? 150 : 350;
  const [vibesOpacity, setVibesOpacity] = React.useState(0);
  const [vibesRenderKey, setVibesRenderKey] = React.useState(0);
  const [displayedVibeSeed, setDisplayedVibeSeed] = React.useState('');
  const vibesPhaseRef = React.useRef<'hidden' | 'showing' | 'fading'>('hidden');
  const vibesTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibesSeqRef = React.useRef(0);
  const vibesPendingRef = React.useRef<{
    seed: string;
    palette: ExtractedPalette | null;
    energy: number;
    trackId: string | null;
  } | null>(null);
  const vibesActiveSeedRef = React.useRef<string>('');

  React.useEffect(() => {
    return () => {
      if (vibesTimerRef.current !== null) {
        clearTimeout(vibesTimerRef.current);
      }
    };
  }, []);

  const currentTrackId = currentTrack?.track_id ?? null;
  // Keep target ref in sync for lyrics timer callbacks
  currentLyricsTargetRef.current = currentTrackId;

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ── Reduced motion detection ──
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
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
    setShowVibes(restored.showVibes);
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
        return;
      }

      if (detail.key === MIDORIAI_RADIO_VIBE_KEY) {
        setShowVibes(detail.value === 'true');
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
    if (!hydrated) {
      return;
    }

    saveRadioVibe(showVibes);
  }, [hydrated, showVibes]);

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

  const cancelReconnect = React.useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
  }, []);

  const scheduleReconnect = React.useCallback(() => {
    if (!playbackDesiredRef.current || reconnectTimerRef.current !== null) {
      return;
    }

    const delay = getRadioReconnectDelay(reconnectAttemptRef.current);
    setStreamState('loading');
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      reconnectAttemptRef.current += 1;
      if (playbackDesiredRef.current) {
        startPlaybackRef.current();
      }
    }, delay);
  }, []);

  const refreshCurrent = React.useCallback(
    async (selectedChannel: string) => {
      const requestId = currentRequestRef.current + 1;
      currentRequestRef.current = requestId;
      currentAbortRef.current?.abort();
      const controller = new AbortController();
      currentAbortRef.current = controller;

      try {
        const payload = await fetchCurrent(selectedChannel, '', controller.signal);

        if (currentRequestRef.current !== requestId || controller.signal.aborted) {
          return;
        }

        setCurrentTrack(payload);
        syncProgress(payload);
        setLastError(null);
      } catch (error) {
        if (currentRequestRef.current !== requestId || controller.signal.aborted) {
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
      currentAbortRef.current?.abort();
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
    const controller = new AbortController();

    const loadChannels = async () => {
      try {
        const payload = await fetchChannels('', controller.signal);
        if (!active || controller.signal.aborted) {
          return;
        }

        const sortedChannels = [...payload.channels].sort((a, b) => a.name.localeCompare(b.name));
        setChannels(sortedChannels);

        const activeChannel = normalizeChannel(channelRef.current);
        if (!sortedChannels.some((entry) => entry.name === activeChannel)) {
          setChannel('all');
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setLastError(toErrorMessage(error));
        }
      }
    };

    void loadChannels();

    return () => {
      active = false;
      controller.abort();
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
    artAbortRef.current?.abort();
    const controller = new AbortController();
    artAbortRef.current = controller;
    const requestedChannel = normalizeChannel(channel);
    const requestedTrackId = currentTrackId;

    const loadArt = async () => {
      try {
        const payload = await fetchArt(requestedChannel, '', controller.signal);

        if (artRequestRef.current !== requestId || controller.signal.aborted) {
          return;
        }

        setArtMetadata(payload);

        const nextArtUrl =
          payload.has_art && payload.track_id === requestedTrackId
            ? appendTrackCacheKey(payload.art_url.trim(), payload.track_id)
            : null;
        setArtUrl(nextArtUrl && nextArtUrl.length > 0 ? nextArtUrl : null);
      } catch {
        if (artRequestRef.current !== requestId || controller.signal.aborted) {
          return;
        }
        setArtMetadata(null);
        setArtUrl(null);
      }
    };

    void loadArt();

    return () => {
      controller.abort();
    };
  }, [channel, currentTrackId, hydrated]);

  React.useEffect(() => {
    if (!artUrl) {
      setArtPalette(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const paletteUrl = `/api/radio/palette?url=${encodeURIComponent(artUrl)}`;

    fetch(paletteUrl, { signal: controller.signal })
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
      controller.abort();
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

  // ── Cleanup lyrics timer on unmount ──
  React.useEffect(() => {
    return () => {
      if (lyricsTimerRef.current !== null) {
        clearTimeout(lyricsTimerRef.current);
      }
    };
  }, []);

  // ── Lyrics panel lifecycle ──
  React.useEffect(() => {
    const trackId = currentTrackId;
    const animDuration = reducedMotion ? LYRICS_ANIM_REDUCED_MS : LYRICS_ANIM_MS;

    const clearTimer = () => {
      if (lyricsTimerRef.current !== null) {
        clearTimeout(lyricsTimerRef.current);
        lyricsTimerRef.current = null;
      }
    };

    const performEnter = (content: string, tid: string) => {
      lyricsPhaseRef.current = 'entering';
      lyricsTrackIdRef.current = tid;
      pendingLyricsRef.current = null;
      setLyricsContent(content);
      setLyricsMounted(true);
      setLyricsExpanded(false);

      clearTimer();
      // rAF delay so the initial collapsed render paints before expansion
      lyricsTimerRef.current = setTimeout(() => {
        setLyricsExpanded(true);
        setLyricsEnterKey((k) => k + 1);

        lyricsTimerRef.current = setTimeout(() => {
          lyricsPhaseRef.current = 'visible';
        }, animDuration);
      }, 16);
    };

    const performExit = () => {
      lyricsPhaseRef.current = 'exiting';
      clearTimer();
      setLyricsExpanded(false);

      lyricsTimerRef.current = setTimeout(() => {
        lyricsPhaseRef.current = 'hidden';
        lyricsTrackIdRef.current = null;
        setLyricsMounted(false);
        setLyricsContent(null);

        const pending = pendingLyricsRef.current;
        if (pending !== null && pending.trackId === currentLyricsTargetRef.current) {
          lyricsTimerRef.current = setTimeout(() => {
            performEnter(pending.content, pending.trackId);
          }, 30);
        }
      }, animDuration);
    };

    // No track — reset everything
    if (trackId === null) {
      if (lyricsPhaseRef.current !== 'hidden') {
        performExit();
      }
      return;
    }

    const hasValidLyrics = !!(
      probeData?.ok &&
      (probeData?.lyricsEng ?? '').trim() &&
      (probeData?.lyricsEng ?? '').trim() !== '[Instrumental]'
    );
    const newContent = hasValidLyrics ? (probeData?.lyricsEng ?? '').trim() : null;

    const phase = lyricsPhaseRef.current;
    const currentLyricsTrack = lyricsTrackIdRef.current;

    // Track changed away from our currently displayed lyrics
    if (currentLyricsTrack !== null && currentLyricsTrack !== trackId) {
      if (phase === 'visible' || phase === 'entering') {
        pendingLyricsRef.current = null;
        performExit();
      }
      return;
    }

    // Same track — only react if lyrics became invalid (e.g. switched to instrumental)
    if (currentLyricsTrack === trackId) {
      if (!probeLoading && newContent === null && phase === 'visible') {
        performExit();
      }
      return;
    }

    // No lyrics currently displayed for this track
    if (!probeLoading) {
      if (newContent === null) {
        if (phase === 'visible' || phase === 'entering') {
          performExit();
        }
        return;
      }

      // Valid lyrics — if currently exiting, store as pending
      if (phase === 'exiting') {
        pendingLyricsRef.current = { content: newContent, trackId };
        return;
      }

      if (phase === 'hidden') {
        performEnter(newContent, trackId);
      }
    }
  }, [currentTrackId, probeData, probeLoading, reducedMotion]);

  // ── Scroll edge-fade detection ──
  React.useEffect(() => {
    if (!lyricsMounted) return;
    const el = lyricsScrollRef.current;
    if (!el) return;

    const check = () => {
      if (!lyricsScrollRef.current) return;
      const s = lyricsScrollRef.current;
      setLyricsScrollTop(s.scrollTop > 2);
      setLyricsScrollBottom(s.scrollTop + s.clientHeight < s.scrollHeight - 2);
    };

    check();
    // Re-check after enter animation settles; lyricsEnterKey bump drives the retrigger
    void lyricsEnterKey;
    const timer = setTimeout(check, 400);
    return () => clearTimeout(timer);
  }, [lyricsEnterKey, lyricsMounted]);

  const handleLyricsScroll = React.useCallback(() => {
    const el = lyricsScrollRef.current;
    if (!el) return;
    setLyricsScrollTop(el.scrollTop > 2);
    setLyricsScrollBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

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

    audio.src = streamUrl;
    audio.load();
    audio.play().catch((error: DOMException) => {
      if (error.name === 'NotAllowedError') {
        setStreamState('error');
        setPlaybackDesired(false);
        playbackDesiredRef.current = false;
        setLastError('Playback blocked by browser. Press play to retry.');
        return;
      }

      scheduleReconnect();
    });
  }, [scheduleReconnect]);

  React.useEffect(() => {
    startPlaybackRef.current = startPlayback;
  }, [startPlayback]);

  const stopPlayback = React.useCallback(() => {
    cancelReconnect();
    setPlaybackDesired(false);
    playbackDesiredRef.current = false;

    const audio = audioRef.current;
    if (audio !== null) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    setStreamState('idle');
  }, [cancelReconnect]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (prevChannelRef.current === channel) return;
    prevChannelRef.current = channel;

    if (!playbackDesiredRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    const userVolume = volumeRef.current;

    const doChannelSwitch = async () => {
      await fadeAudioVolume(audio, userVolume, 0, 500);
      stopPlayback();
      startPlayback();
      await new Promise((r) => setTimeout(r, 50));
      const newAudio = audioRef.current;
      if (newAudio) {
        await fadeAudioVolume(newAudio, 0, userVolume, 500);
      }
    };

    void doChannelSwitch();
  }, [channel, hydrated, stopPlayback, startPlayback]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot hydration effect
  React.useEffect(() => {
    if (!hydrated) return;
    if (!restoreInitialRef.current) return;
    restoreInitialRef.current = false;
    const restored = loadRadioState();
    if (restored.playing) {
      startPlayback();
    }
  }, [hydrated]);

  React.useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.volume = clampVolume(volumeRef.current);
    audioRef.current = audio;

    const handlePlaying = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectAttemptRef.current = 0;
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
        scheduleReconnect();
      }
    };

    const handleError = () => {
      if (!playbackDesiredRef.current) {
        return;
      }

      scheduleReconnect();
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
  }, [scheduleReconnect]);

  React.useEffect(() => {
    return () => {
      cancelReconnect();
    };
  }, [cancelReconnect]);

  React.useEffect(() => {
    if (!mobileVolOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && mobileVolRef.current?.contains(target)) {
        return;
      }
      setMobileVolOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mobileVolOpen]);

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

  const vibeSeed =
    [probeData?.midori_ai_vibe_summary, probeData?.midori_ai_vibe_analysis]
      .filter(Boolean)
      .join(' ') || '';
  const vibeEnergy = React.useMemo(() => (vibeSeed ? detectEnergy(vibeSeed) : 0), [vibeSeed]);

  // ── Vibes fade: toggle + crossfade ──
  // biome-ignore lint/correctness/useExhaustiveDependencies: uses refs for deferred captures; extra deps would trigger unwanted re-runs
  React.useEffect(() => {
    if (!showVibes) {
      if (vibesPhaseRef.current === 'hidden') return;
      if (vibesTimerRef.current !== null) clearTimeout(vibesTimerRef.current);
      vibesSeqRef.current += 1;
      const seq = vibesSeqRef.current;
      vibesPhaseRef.current = 'fading';
      vibesPendingRef.current = null;
      setVibesOpacity(0);
      vibesTimerRef.current = setTimeout(() => {
        if (seq !== vibesSeqRef.current) return;
        vibesPhaseRef.current = 'hidden';
        vibesActiveSeedRef.current = '';
        setDisplayedVibeSeed('');
        setVibesRenderKey((k) => k + 1);
      }, VIBES_FADE_MS);
      return;
    }

    if (!vibeSeed) {
      if (vibesPhaseRef.current === 'hidden') return;
      if (vibesTimerRef.current !== null) clearTimeout(vibesTimerRef.current);
      vibesSeqRef.current += 1;
      const seq = vibesSeqRef.current;
      vibesPhaseRef.current = 'fading';
      vibesPendingRef.current = null;
      setVibesOpacity(0);
      vibesTimerRef.current = setTimeout(() => {
        if (seq !== vibesSeqRef.current) return;
        vibesPhaseRef.current = 'hidden';
        vibesActiveSeedRef.current = '';
        setDisplayedVibeSeed('');
        setVibesRenderKey((k) => k + 1);
      }, VIBES_FADE_MS);
      return;
    }

    if (vibeSeed === vibesActiveSeedRef.current) {
      // If showVibes is true but we're not in the 'showing' phase, a pending
      // hide timer may still be running (e.g., user hid then re-enabled within
      // the fade window). Cancel it and restore visibility.
      if (vibesPhaseRef.current !== 'showing') {
        if (vibesTimerRef.current !== null) clearTimeout(vibesTimerRef.current);
        vibesSeqRef.current += 1;
        vibesPhaseRef.current = 'showing';
        vibesActiveSeedRef.current = vibeSeed;
        setDisplayedVibeSeed(vibeSeed);
        setVibesOpacity(1);
        setVibesRenderKey((k) => k + 1);
      }
      return;
    }

    const target = {
      seed: vibeSeed,
      palette: artPalette,
      energy: vibeEnergy,
      trackId: currentTrackId,
    };

    if (vibesPhaseRef.current === 'hidden') {
      vibesPhaseRef.current = 'fading';
      vibesActiveSeedRef.current = vibeSeed;
      setDisplayedVibeSeed(vibeSeed);
      setVibesRenderKey((k) => k + 1);
      vibesSeqRef.current += 1;
      const seq = vibesSeqRef.current;
      requestAnimationFrame(() => {
        if (seq !== vibesSeqRef.current) return;
        setVibesOpacity(1);
        vibesPhaseRef.current = 'showing';
      });
      return;
    }

    if (vibesPhaseRef.current === 'showing') {
      vibesActiveSeedRef.current = vibeSeed;
      setDisplayedVibeSeed(vibeSeed);
      return;
    }

    vibesPendingRef.current = target;
  }, [showVibes, vibeSeed]);

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
          pb: { xs: '68px', md: '72px' },
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
            display: { xs: 'none', md: 'flex' },
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
          <Typography
            level="body-sm"
            sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }}
          >
            Listening Room
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}
        >
          <Box
            sx={{
              flex: { xs: '1 1 auto', md: '0 0 50%' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: { xs: 1.5, md: 3 },
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
                  maxHeight: { xs: 'min(70vh)', md: 'none' },
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
              pb: { xs: 1, md: 3 },
              justifyContent: { xs: 'center', md: 'flex-start' },
              minWidth: 0,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent={{ xs: 'center', md: 'flex-start' }}
              spacing={1}
              flexWrap="wrap"
            >
              {listenerCount !== null && (
                <>
                  <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                    <Users size={14} />
                  </Box>
                  <Typography
                    level="body-sm"
                    sx={{ color: 'text.tertiary', display: { xs: 'none', md: 'block' } }}
                  >
                    {listenerCount}
                  </Typography>
                  <Typography
                    level="body-sm"
                    sx={{ color: 'text.tertiary', display: { xs: 'none', md: 'block' } }}
                  >
                    ·
                  </Typography>
                </>
              )}
              <Typography
                level="h3"
                sx={{
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  lineHeight: 1.3,
                  textAlign: { xs: 'center', md: 'left' },
                }}
              >
                {title}
              </Typography>
              <Typography
                level="body-sm"
                sx={{ color: 'text.tertiary', display: { xs: 'none', md: 'block' } }}
              >
                ·
              </Typography>
              <Typography
                level="body-sm"
                sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }}
              >
                {artist}
              </Typography>
              <Typography
                level="body-xs"
                sx={{ color: 'text.tertiary', display: { xs: 'none', md: 'block' } }}
              >
                ·
              </Typography>
              <Chip
                size="sm"
                variant="soft"
                color={isPlaying ? 'success' : streamState === 'error' ? 'danger' : 'neutral'}
                sx={{
                  borderRadius: 0,
                  '--Chip-minHeight': '22px',
                  minHeight: 22,
                  display: { xs: 'none', md: 'inline-flex' },
                }}
              >
                {streamStateLabel}
              </Chip>
              <Typography
                level="body-xs"
                sx={{ color: 'text.tertiary', display: { xs: 'none', md: 'block' } }}
              >
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
                  display: { xs: 'none', md: 'block' },
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
              <Typography
                level="body-sm"
                sx={{ color: 'danger.300', mt: 0.5, display: { xs: 'none', md: 'block' } }}
              >
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
                bgcolor: 'rgba(10,12,18,0.3)',
                backdropFilter: 'blur(20px)',
                borderColor:
                  showVibes && artPalette ? `${artPalette.primary}20` : 'rgba(255,255,255,0.08)',
                borderRadius: 0,
                overflow: 'hidden',
                position: 'relative',
                transition: 'border-color 0.35s ease',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  pt: 1.5,
                  pb: 0.5,
                  zIndex: 1,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  level="body-sm"
                  sx={{
                    color: showVibes && artPalette ? artPalette.primary : 'text.tertiary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    transition: 'color 350ms ease',
                  }}
                >
                  Vibes
                </Typography>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowVibes((prev) => !prev)}
                  onKeyDown={(event: React.KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setShowVibes((prev) => !prev);
                    }
                  }}
                  aria-label={showVibes ? 'Hide vibes visualization' : 'Show vibes visualization'}
                  aria-pressed={showVibes}
                  sx={{
                    cursor: 'pointer',
                    minWidth: 44,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: showVibes ? (artPalette?.primary ?? 'text.tertiary') : 'text.tertiary',
                    opacity: showVibes ? 0.9 : 0.4,
                    transition: 'color 350ms ease, opacity 200ms ease',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.400',
                      outlineOffset: 2,
                    },
                    '&:hover': {
                      opacity: 1,
                    },
                  }}
                >
                  {showVibes ? <Eye size={18} /> : <EyeOff size={18} />}
                </Box>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  minHeight: 0,
                  position: 'relative',
                  opacity: vibesOpacity,
                  transition: `opacity ${VIBES_FADE_MS}ms ease`,
                }}
              >
                <Box key={vibesRenderKey}>
                  {displayedVibeSeed && currentTrack ? (
                    <VibesCanvas
                      seed={displayedVibeSeed}
                      trackId={currentTrack.track_id}
                      startedAt={currentTrack.started_at}
                      durationMs={durationMs}
                      positionMs={positionMs}
                      palette={artPalette}
                      energyMultiplier={vibeEnergy}
                      reducedMotion={reducedMotion}
                    />
                  ) : showVibes && probeLoading ? (
                    <Stack spacing={1} sx={{ px: 2, pb: 2 }}>
                      <Skeleton variant="text" width="90%" />
                      <Skeleton variant="text" width="75%" />
                      <Skeleton variant="text" width="85%" />
                      <Skeleton variant="text" width="60%" />
                    </Stack>
                  ) : showVibes && !vibeSeed ? (
                    <Box
                      sx={{
                        px: 2,
                        pb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                      }}
                    >
                      <Typography
                        level="body-sm"
                        sx={{ color: 'text.secondary', fontSize: { xs: '0.875rem' } }}
                      >
                        Vibes will appear here when the stream publishes them.
                      </Typography>
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </Sheet>
            {lyricsMounted ? (
              <Box
                sx={{
                  display: { xs: 'none', md: 'block' },
                  maxHeight: lyricsExpanded ? '60vh' : '0px',
                  overflow: 'hidden',
                  transition: `max-height ${reducedMotion ? LYRICS_ANIM_REDUCED_MS : LYRICS_ANIM_MS}ms ease-out`,
                  mt: 1,
                }}
              >
                <Sheet
                  variant="outlined"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '60vh',
                    bgcolor: 'rgba(10,12,18,0.4)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 0,
                    position: 'relative',
                    animation:
                      lyricsExpanded && lyricsEnterKey > 0
                        ? reducedMotion
                          ? 'none'
                          : `${borderGlow} 1.2s ease-out`
                        : 'none',
                  }}
                >
                  <Box sx={{ px: 2, pt: 1.5, pb: 0.5, flexShrink: 0 }}>
                    <Typography
                      level="body-sm"
                      sx={{
                        color: artPalette?.primary ?? 'primary.400',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        transition: 'color 350ms ease',
                      }}
                    >
                      Lyrics
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      position: 'relative',
                      flex: 1,
                      minHeight: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {lyricsScrollTop && (
                      <Box
                        aria-hidden
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 28,
                          zIndex: 1,
                          background:
                            'linear-gradient(to bottom, rgba(10,12,18,0.95), transparent)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    <Box
                      ref={lyricsScrollRef}
                      onScroll={handleLyricsScroll}
                      sx={{
                        overflow: 'auto',
                        height: '100%',
                        px: 2,
                        pb: 2,
                      }}
                    >
                      <Box
                        key={lyricsEnterKey}
                        sx={{
                          animation:
                            lyricsMounted && !lyricsExpanded
                              ? reducedMotion
                                ? `${lyricsFadeOutOnly} ${LYRICS_ANIM_REDUCED_MS}ms ease-out`
                                : `${lyricsExitDrop} ${LYRICS_ANIM_MS}ms ease-out`
                              : lyricsExpanded && lyricsEnterKey > 0
                                ? reducedMotion
                                  ? `${lyricsFadeOnly} ${LYRICS_ANIM_REDUCED_MS}ms ease-out`
                                  : `${lyricsEnterRise} ${LYRICS_ANIM_MS}ms ease-out`
                                : 'none',
                        }}
                      >
                        {(lyricsContent ?? '').split('\n').map((line, i) => {
                          const sectionLabelMatch = line.match(SECTION_LABEL_RE);
                          if (sectionLabelMatch?.[1]) {
                            const labelText = toTitleCase(sectionLabelMatch[1]);
                            const labelIdx = hashLabelToIndex(labelText);
                            const labelColor = pickPaletteHex(labelIdx, artPalette);
                            const glowColor = `${pickPaletteHex(labelIdx + 1, artPalette)}40`;
                            return (
                              <Typography
                                key={
                                  // biome-ignore lint/suspicious/noArrayIndexKey: static lyrics list won't be reordered
                                  i
                                }
                                level="body-sm"
                                sx={{
                                  color: labelColor,
                                  textShadow: `0 0 6px ${glowColor}`,
                                  transition: 'color 350ms ease',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  mt: i > 0 ? 1.5 : 0,
                                  mb: 0.5,
                                }}
                              >
                                {labelText}
                              </Typography>
                            );
                          }
                          return line === '' ? (
                            // biome-ignore lint/suspicious/noArrayIndexKey: static lyrics list won't be reordered
                            <Box key={i} sx={{ height: '0.7em' }} />
                          ) : (
                            <Typography
                              key={
                                // biome-ignore lint/suspicious/noArrayIndexKey: static lyrics list won't be reordered
                                i
                              }
                              level="body-sm"
                              sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}
                            >
                              {line}
                            </Typography>
                          );
                        })}
                      </Box>
                    </Box>
                    {lyricsScrollBottom && (
                      <Box
                        aria-hidden
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 28,
                          zIndex: 1,
                          background: 'linear-gradient(to top, rgba(10,12,18,0.95), transparent)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </Box>
                </Sheet>
              </Box>
            ) : null}
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
          direction="row"
          spacing={{ xs: 0.5, md: 2 }}
          alignItems="center"
          sx={{ px: { xs: 1, md: 3 }, py: { xs: 0.75, md: 1 } }}
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

          <Box sx={{ flex: 1, minWidth: 0, maxWidth: { xs: 'none', md: '80%' } }}>
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
              sx={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 0,
                display: 'inline-flex',
              }}
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
              sx={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 0,
                display: 'inline-flex',
              }}
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
                display: { xs: 'none', md: 'flex' },
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

            <Box
              ref={mobileVolRef}
              sx={{
                position: 'relative',
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
                minHeight: 44,
              }}
            >
              {mobileVolOpen && (
                <Stack
                  aria-label="Mobile volume"
                  sx={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    alignItems: 'center',
                    p: 0.5,
                    bgcolor: 'rgba(8,8,14,0.94)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(18px)',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
                  }}
                >
                  {[...volumeDots].reverse().map((dot, reverseIndex) => {
                    const volumeIndex = volumeDots.length - 1 - reverseIndex;
                    return (
                      <Box
                        key={`mobile-${dot.id}`}
                        component="button"
                        type="button"
                        onClick={() => {
                          setVolume(clampVolume(volumeIndex / 9));
                          setMobileVolOpen(false);
                        }}
                        aria-label={`Volume ${Math.round((volumeIndex / 9) * 100)}%`}
                        sx={{
                          width: 44,
                          height: 44,
                          p: 0,
                          border: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'transparent',
                          cursor: 'pointer',
                          '&::before': {
                            content: '""',
                            width: 24,
                            height: 8,
                            bgcolor: dot.active ? 'primary.400' : 'rgba(255,255,255,0.2)',
                          },
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.400',
                            outlineOffset: -2,
                          },
                        }}
                      />
                    );
                  })}
                </Stack>
              )}

              <Box
                component="button"
                type="button"
                onClick={() => setMobileVolOpen((open) => !open)}
                aria-label="Toggle volume"
                aria-expanded={mobileVolOpen}
                sx={{
                  minWidth: 44,
                  minHeight: 44,
                  border: 0,
                  p: 0,
                  color: 'inherit',
                  bgcolor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.400',
                    outlineOffset: 2,
                  },
                }}
              >
                <Volume2 size={20} />
              </Box>
            </Box>
          </Stack>
        </Stack>
      </Sheet>
    </Box>
  );
}
