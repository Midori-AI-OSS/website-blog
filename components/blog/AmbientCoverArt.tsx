'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Box, Card } from '@mui/joy'

export const AMBIENT_PULSE_KEYFRAMES = {
  '@keyframes ambient-pulse': {
    '0%': { transform: 'scale(1.1)', opacity: 0.8 },
    '50%': { transform: 'scale(1.14)', opacity: 0.6 },
    '100%': { transform: 'scale(1.1)', opacity: 0.8 },
  },
}

export interface AmbientCoverArtProps {
  coverImageUrl: string
  alt: string
  isScheduledPreview?: boolean
  minHeight?: { xs?: string | number; sm?: string | number }
  children?: ReactNode
  onAspectRatioChange?: (isLandscape: boolean) => void
}

export function AmbientCoverArt({
  coverImageUrl,
  alt,
  isScheduledPreview = false,
  minHeight,
  children,
  onAspectRatioChange,
}: AmbientCoverArtProps) {
  const [coverIsLandscape, setCoverIsLandscape] = useState<boolean | null>(null)

  useEffect(() => {
    setCoverIsLandscape(null)
  }, [coverImageUrl])

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
        component="img"
        src={coverImageUrl}
        alt=""
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: isScheduledPreview ? 'blur(34px) brightness(0.45)' : 'blur(20px) brightness(0.6)',
          transform: 'scale(1.1)',
          zIndex: 0,
          opacity: 0.8,
          animation: 'ambient-pulse 10s ease-in-out infinite',
        }}
      />

      <Box
        component="img"
        src={coverImageUrl}
        alt={alt}
        loading="lazy"
        onLoad={(event) => {
          const img = event.currentTarget
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            const isLandscape = img.naturalWidth > img.naturalHeight
            setCoverIsLandscape(isLandscape)
            onAspectRatioChange?.(isLandscape)
          }
        }}
        sx={{
          position: 'relative',
          zIndex: 1,
          objectFit: 'contain',
          maxWidth: {
            xs: coverIsLandscape === true ? '84%' : '72%',
            sm: coverIsLandscape === true ? '60%' : '35%',
          },
          height: 'auto',
          maxHeight: { xs: '22%', sm: '15%' },
          width: 'auto',
          display: 'block',
          filter: isScheduledPreview ? 'blur(18px) saturate(0.72) brightness(0.7)' : 'none',
          transform: isScheduledPreview ? 'scale(1.08)' : 'none',
        }}
      />

      {children}
    </Card>
  )
}
