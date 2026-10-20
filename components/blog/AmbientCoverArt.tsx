'use client';

import { Box, Card } from '@mui/joy';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useNearViewport } from './useNearViewport';

export const AMBIENT_PULSE_KEYFRAMES = {
  '@keyframes ambient-pulse': {
    '0%': { transform: 'scale(1.1)', opacity: 0.8 },
    '50%': { transform: 'scale(1.14)', opacity: 0.6 },
    '100%': { transform: 'scale(1.1)', opacity: 0.8 },
  },
};

export interface AmbientCoverArtProps {
  coverImageUrl: string;
  alt: string;
  isScheduledPreview?: boolean;
  minHeight?: { xs?: string | number; sm?: string | number };
  children?: ReactNode;
  onAspectRatioChange?: (isLandscape: boolean) => void;
  onImageError?: (url: string) => void;
  deferArtwork?: boolean;
  intrinsicSize?: { width: number; height: number };
}

export function AmbientCoverArt({
  coverImageUrl,
  alt,
  isScheduledPreview = false,
  minHeight,
  children,
  onAspectRatioChange,
  onImageError,
  deferArtwork = false,
  intrinsicSize,
}: AmbientCoverArtProps) {
  const { ref: artworkRef, shouldLoad: loadArtwork } =
    useNearViewport<HTMLDivElement>(deferArtwork);
  const [coverIsLandscape, setCoverIsLandscape] = useState<boolean | null>(null);
  const lastFailedUrlRef = useRef<string | null>(null);
  const previousCoverImageUrlRef = useRef(coverImageUrl);

  useEffect(() => {
    if (previousCoverImageUrlRef.current === coverImageUrl) return;
    previousCoverImageUrlRef.current = coverImageUrl;
    lastFailedUrlRef.current = null;
    setCoverIsLandscape(null);
  }, [coverImageUrl]);

  const handleImageError = () => {
    if (lastFailedUrlRef.current === coverImageUrl) return;
    lastFailedUrlRef.current = coverImageUrl;
    onImageError?.(coverImageUrl);
  };

  const isLandscape = intrinsicSize
    ? intrinsicSize.width > intrinsicSize.height
    : coverIsLandscape === true;
  const foreground = loadArtwork ? (
    <Box
      component="img"
      src={coverImageUrl}
      alt={alt}
      loading="lazy"
      onError={handleImageError}
      onLoad={(event) => {
        const img = event.currentTarget;
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const landscape = img.naturalWidth > img.naturalHeight;
          setCoverIsLandscape(landscape);
          onAspectRatioChange?.(landscape);
        }
      }}
      sx={{
        position: intrinsicSize ? 'absolute' : 'relative',
        inset: intrinsicSize ? 0 : undefined,
        zIndex: 1,
        objectFit: 'contain',
        maxWidth: intrinsicSize
          ? undefined
          : { xs: isLandscape ? '84%' : '72%', sm: isLandscape ? '60%' : '35%' },
        height: intrinsicSize ? '100%' : 'auto',
        maxHeight: intrinsicSize ? undefined : { xs: '22%', sm: '15%' },
        width: intrinsicSize ? '100%' : 'auto',
        display: 'block',
        filter: isScheduledPreview ? 'blur(18px) saturate(0.72) brightness(0.7)' : 'none',
        transform: isScheduledPreview ? 'scale(1.08)' : 'none',
      }}
    />
  ) : null;

  return (
    <Card
      ref={artworkRef}
      variant="plain"
      sx={{
        p: 0,
        borderRadius: 0,
        border: 'none',
        bgcolor: 'black',
        overflow: 'hidden',
        minHeight: {
          xs: minHeight?.xs ?? '220px',
          sm: minHeight?.sm ?? '300px',
        },
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '--Card-padding': '0px',
        '&:hover, &:focus-within': {
          bgcolor: 'black',
          borderColor: 'transparent',
          boxShadow: 'none',
          outline: 'none',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          boxShadow: 'inset 0 0 60px 30px #000',
          pointerEvents: 'none',
        }}
      />

      {loadArtwork && (
        <Box
          component="img"
          src={coverImageUrl}
          alt=""
          onError={handleImageError}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: isScheduledPreview
              ? 'blur(34px) brightness(0.45)'
              : 'blur(20px) brightness(0.6)',
            transform: 'scale(1.1)',
            zIndex: 0,
            opacity: 0.8,
            animation: 'ambient-pulse 10s ease-in-out infinite',
          }}
        />
      )}

      {intrinsicSize ? (
        <Box
          data-cover-frame
          sx={{
            position: 'relative',
            flexShrink: 0,
            width: {
              xs: `min(${intrinsicSize.width}px, ${isLandscape ? '84%' : '72%'})`,
              sm: `min(${intrinsicSize.width}px, ${isLandscape ? '60%' : '35%'})`,
            },
            aspectRatio: `${intrinsicSize.width} / ${intrinsicSize.height}`,
          }}
        >
          {foreground}
        </Box>
      ) : (
        foreground
      )}

      {children}
    </Card>
  );
}
