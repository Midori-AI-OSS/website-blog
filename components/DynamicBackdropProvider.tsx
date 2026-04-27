'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';

import {
  DEFAULT_ART_PALETTE,
  extractPaletteFromImage,
  type ExtractedPalette,
} from '@/lib/theme/artPalette';
import {
  resolveBackdropSource,
  toDarkMediumBackdropPalette,
} from '@/lib/theme/dynamicBackdrop';

const PLACEHOLDER_IMAGE_URL = '/blog/placeholder.png';
const DESKTOP_MIN_WIDTH = 1280;

interface RadioBackdropState {
  playing: boolean;
  artUrl: string | null;
}

interface DynamicBackdropContextValue {
  setPostCoverUrl: (url: string | null) => void;
  setRadioState: (state: RadioBackdropState) => void;
}

const noop = () => undefined;

const DynamicBackdropContext = React.createContext<DynamicBackdropContextValue>({
  setPostCoverUrl: noop,
  setRadioState: noop,
});

function useMinWidth(minWidth: number): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const query = window.matchMedia(`(min-width: ${minWidth}px)`);
    const update = () => setMatches(query.matches);
    update();

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, [minWidth]);

  return matches;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(query.matches);
    update();

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  return prefersReducedMotion;
}

interface DynamicBackdropProviderProps {
  children: React.ReactNode;
}

export default function DynamicBackdropProvider({ children }: DynamicBackdropProviderProps) {
  const [postCoverUrl, setPostCoverUrl] = React.useState<string | null>(null);
  const [radioState, setRadioState] = React.useState<RadioBackdropState>({
    playing: false,
    artUrl: null,
  });
  const [palette, setPalette] = React.useState<ExtractedPalette>(() =>
    toDarkMediumBackdropPalette(DEFAULT_ART_PALETTE)
  );
  const [placeholderPalette, setPlaceholderPalette] = React.useState<ExtractedPalette>(
    DEFAULT_ART_PALETTE
  );

  const isDesktop = useMinWidth(DESKTOP_MIN_WIDTH);
  const prefersReducedMotion = usePrefersReducedMotion();

  const resolvedSource = React.useMemo(
    () =>
      resolveBackdropSource({
        radioPlaying: radioState.playing,
        radioArtUrl: radioState.artUrl,
        postCoverUrl,
        placeholderUrl: PLACEHOLDER_IMAGE_URL,
      }),
    [radioState.playing, radioState.artUrl, postCoverUrl]
  );

  React.useEffect(() => {
    if (!isDesktop) {
      return;
    }

    let active = true;

    const syncPlaceholderPalette = async () => {
      const extracted = await extractPaletteFromImage(PLACEHOLDER_IMAGE_URL, {
        fallback: DEFAULT_ART_PALETTE,
      });
      if (!active) return;
      setPlaceholderPalette(extracted);
    };

    void syncPlaceholderPalette();

    return () => {
      active = false;
    };
  }, [isDesktop]);

  React.useEffect(() => {
    if (!isDesktop) {
      return;
    }

    let active = true;

    const syncPalette = async () => {
      const extracted = await extractPaletteFromImage(resolvedSource.url, {
        fallback: placeholderPalette,
      });
      if (!active) return;
      setPalette(toDarkMediumBackdropPalette(extracted));
    };

    void syncPalette();

    return () => {
      active = false;
    };
  }, [isDesktop, resolvedSource.url, placeholderPalette]);

  const contextValue = React.useMemo<DynamicBackdropContextValue>(
    () => ({
      setPostCoverUrl,
      setRadioState,
    }),
    []
  );

  const animated = isDesktop && !prefersReducedMotion;
  const blobAnimation = animated ? 'dynamic-backdrop-drift 180s ease-in-out infinite alternate' : 'none';

  return (
    <DynamicBackdropContext.Provider value={contextValue}>
      {isDesktop && (
        <Box
          data-dynamic-backdrop="active"
          data-dynamic-backdrop-mode={resolvedSource.mode}
          aria-hidden
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            backgroundColor: '#040509',
            transition: 'background-color 45s linear',
            '@keyframes dynamic-backdrop-drift': {
              '0%': { transform: 'translate3d(-3%, -2%, 0) scale(1)' },
              '50%': { transform: 'translate3d(2%, 3%, 0) scale(1.06)' },
              '100%': { transform: 'translate3d(4%, -1%, 0) scale(1.02)' },
            },
            '@keyframes dynamic-backdrop-drift-reverse': {
              '0%': { transform: 'translate3d(2%, 3%, 0) scale(1.04)' },
              '50%': { transform: 'translate3d(-3%, -2%, 0) scale(1.01)' },
              '100%': { transform: 'translate3d(-1%, 4%, 0) scale(1.06)' },
            },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: '-20%',
              background: 'radial-gradient(circle at center, rgba(255,255,255,0.02), transparent 60%)',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              width: '70vw',
              height: '70vw',
              left: '-34vw',
              top: '-36vh',
              borderRadius: '50%',
              backgroundColor: palette.primary,
              filter: 'blur(170px)',
              opacity: 0.34,
              animation: blobAnimation,
              transition: 'background-color 45s linear, opacity 45s linear, filter 45s linear',
              willChange: animated ? 'transform' : 'auto',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              width: '68vw',
              height: '68vw',
              right: '-34vw',
              top: '-30vh',
              borderRadius: '50%',
              backgroundColor: palette.secondary,
              filter: 'blur(200px)',
              opacity: 0.3,
              animation: animated
                ? 'dynamic-backdrop-drift-reverse 210s ease-in-out infinite alternate'
                : 'none',
              transition: 'background-color 45s linear, opacity 45s linear, filter 45s linear',
              willChange: animated ? 'transform' : 'auto',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              width: '76vw',
              height: '76vw',
              left: '12vw',
              bottom: '-58vh',
              borderRadius: '50%',
              backgroundColor: palette.tertiary,
              filter: 'blur(190px)',
              opacity: 0.26,
              animation: animated
                ? 'dynamic-backdrop-drift 240s ease-in-out infinite alternate-reverse'
                : 'none',
              transition: 'background-color 45s linear, opacity 45s linear, filter 45s linear',
              willChange: animated ? 'transform' : 'auto',
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(4,5,9,0.22) 0%, rgba(4,5,9,0.44) 35%, rgba(4,5,9,0.72) 100%)',
            }}
          />
        </Box>
      )}

      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </DynamicBackdropContext.Provider>
  );
}

export function useDynamicBackdrop(): DynamicBackdropContextValue {
  return React.useContext(DynamicBackdropContext);
}
