'use client';

import { Box, Card } from '@mui/joy';
import Image from 'next/image';
import { type ReactNode, useEffect, useState } from 'react';

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
}

export function AmbientCoverArt({
  coverImageUrl,
  alt,
  isScheduledPreview = false,
  minHeight,
  children,
  onAspectRatioChange,
  onImageError,
}: AmbientCoverArtProps) {
  const [coverIsLandscape, setCoverIsLandscape] = useState<boolean | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [dimensionsReady, setDimensionsReady] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const foregroundLoaded = loadedUrl === coverImageUrl;

  useEffect(() => {
    let active = true;
    setDimensionsReady(false);
    const img = new window.Image();
    img.onload = () => {
      if (!active) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
        const isLandscape = img.naturalWidth > img.naturalHeight;
        setCoverIsLandscape(isLandscape);
        onAspectRatioChange?.(isLandscape);
      }
      setDimensionsReady(true);
    };
    img.onerror = () => {
      if (active) onImageError?.(coverImageUrl);
    };
    img.src = coverImageUrl;
    return () => {
      active = false;
    };
  }, [coverImageUrl]);

  return (
    <Card
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

      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
      >
        <Image
          src={coverImageUrl}
          alt=""
          fill
          sizes="100vw"
          style={{
            objectFit: 'cover',
            filter: isScheduledPreview
              ? 'blur(34px) brightness(0.45)'
              : 'blur(20px) brightness(0.6)',
            transform: 'scale(1.1)',
            opacity: 0.8,
            animation: 'ambient-pulse 10s ease-in-out infinite',
          }}
          onError={() => onImageError?.(coverImageUrl)}
        />
      </Box>

      {dimensionsReady && imageDims && (
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            width: coverIsLandscape === true ? { xs: '84%', sm: '60%' } : { xs: '72%', sm: '35%' },
            maxWidth: '100%',
            mx: 'auto',
            aspectRatio: `${imageDims.width} / ${imageDims.height}`,
          }}
        >
          <Image
            src={coverImageUrl}
            alt={alt}
            width={imageDims.width}
            height={imageDims.height}
            loading="lazy"
            sizes="(max-width: 600px) 84vw, 60vw"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
              filter: foregroundLoaded
                ? isScheduledPreview
                  ? 'blur(18px) saturate(0.72) brightness(0.7)'
                  : 'none'
                : 'blur(8px)',
              transform: isScheduledPreview ? 'scale(1.08)' : 'none',
              opacity: foregroundLoaded ? 1 : 0.3,
              transition: 'filter 0.6s ease-out, opacity 0.4s ease-out',
            }}
            onError={() => onImageError?.(coverImageUrl)}
            onLoad={() => {
              setLoadedUrl(coverImageUrl);
            }}
          />
        </Box>
      )}

      {children}
    </Card>
  );
}
