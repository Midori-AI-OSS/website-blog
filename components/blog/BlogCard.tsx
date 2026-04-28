'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import Tooltip from '@mui/joy/Tooltip';
import { Calendar, User, ArrowRight, Tag } from 'lucide-react';
import Link from 'next/link';
import type { ParsedPost } from '../../lib/blog/parser';
import { transformPostImageUrl } from '@/lib/content/imageUrl';
import {
  DEFAULT_ART_PALETTE,
  extractPaletteFromImage,
  hexToRgb,
  type ExtractedPalette,
} from '@/lib/theme/artPalette';
import { toDarkMediumBackdropPalette } from '@/lib/theme/dynamicBackdrop';

export type BlogCardProps = {
  post: ParsedPost;
  onClick?: () => void;
  href?: string;
  variant?: 'plain' | 'outlined' | 'soft' | 'solid';
  color?: 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaOnClick?: () => void;
  secondaryCtaTooltip?: string;
  secondaryCtaAriaLabel?: string;
};

function toRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const BlogCard = React.memo(({
  post,
  onClick,
  href,
  variant = 'outlined',
  color = 'neutral',
  secondaryCtaLabel,
  secondaryCtaHref,
  secondaryCtaOnClick,
  secondaryCtaTooltip,
  secondaryCtaAriaLabel,
}: BlogCardProps) => {
  const { metadata, filename } = post;
  const decorativeImageUrl = typeof metadata.cover_image === 'string' && metadata.cover_image.length > 0
    ? transformPostImageUrl(metadata.cover_image)
    : null;
  const [palette, setPalette] = React.useState<ExtractedPalette>(DEFAULT_ART_PALETTE);

  // Extract date from filename if not in metadata (YYYY-MM-DD format)
  const dateFromFilename = filename.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const displayDate = metadata.date || dateFromFilename || new Date().toISOString().split('T')[0];

  React.useEffect(() => {
    if (!decorativeImageUrl) {
      return;
    }

    let active = true;

    const syncPalette = async () => {
      const extracted = await extractPaletteFromImage(decorativeImageUrl, {
        fallback: DEFAULT_ART_PALETTE,
      });
      if (!active) return;
      setPalette(extracted);
    };

    void syncPalette();

    return () => {
      active = false;
    };
  }, [decorativeImageUrl]);

  const tintStyles = React.useMemo(() => {
    if (!decorativeImageUrl) return null;

    const darkPalette = toDarkMediumBackdropPalette(palette);
    const borderColor = toRgba(darkPalette.secondary, 0.55);
    const hoverBorderColor = toRgba(palette.primary, 0.76);
    const backgroundGradient =
      `linear-gradient(120deg, rgba(4, 5, 9, 0.94) 0%, ${toRgba(darkPalette.primary, 0.36)} 42%, rgba(4, 5, 9, 0.9) 100%)`;
    const decorativeOverlay =
      `linear-gradient(to right, rgba(4, 5, 9, 0.97) 0%, ${toRgba(darkPalette.secondary, 0.72)} 30%, rgba(4, 5, 9, 0.06) 74%)`;

    return {
      borderColor,
      hoverBorderColor,
      backgroundGradient,
      decorativeOverlay,
    };
  }, [decorativeImageUrl, palette]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onClick) {
        onClick();
      }
    }
  };

  const hasSecondaryCta = Boolean(secondaryCtaLabel && (secondaryCtaHref || secondaryCtaOnClick));

  const ctaSx = {
    minHeight: 44,
    px: 1.75,
    mt: 1.5,
    borderRadius: 0,
    textTransform: 'none',
    fontWeight: 700,
    letterSpacing: '0.01em',
    alignSelf: 'flex-start',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: 'sm',
    },
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'primary.500',
      outlineOffset: '2px',
    },
  } as const;

  const ctaButton = !hasSecondaryCta
    ? null
    : secondaryCtaHref ? (
      <Button
        size="sm"
        variant="soft"
        color="primary"
        component={Link}
        href={secondaryCtaHref}
        onClick={(event) => {
          event.stopPropagation();
          if (secondaryCtaOnClick) secondaryCtaOnClick();
        }}
        aria-label={secondaryCtaAriaLabel ?? secondaryCtaLabel}
        sx={ctaSx}
      >
        {secondaryCtaLabel}
      </Button>
    ) : (
      <Button
        size="sm"
        variant="soft"
        color="primary"
        onClick={(event) => {
          event.stopPropagation();
          if (secondaryCtaOnClick) secondaryCtaOnClick();
        }}
        aria-label={secondaryCtaAriaLabel ?? secondaryCtaLabel}
        sx={ctaSx}
      >
        {secondaryCtaLabel}
      </Button>
    );

  const secondaryCta = ctaButton && secondaryCtaTooltip ? (
    <Tooltip
      arrow
      placement="top"
      variant="soft"
      title={secondaryCtaTooltip}
      enterTouchDelay={0}
    >
      {ctaButton}
    </Tooltip>
  ) : ctaButton;

  // When href is provided, wrap the entire card in a Link
  const cardContent = (
    <Card
      role="article"
      variant={variant}
      color={color}
      onClick={onClick}
      onKeyDown={!href ? handleKeyDown : undefined}
      tabIndex={!href ? 0 : undefined}
      aria-label={`Read blog post: ${metadata.title}`}
      sx={{
        position: 'relative',
        gap: 2,
        transition: 'all 0.2s',
        cursor: 'pointer',
        bgcolor: decorativeImageUrl ? 'rgba(4, 5, 9, 0.94)' : 'background.surface',
        backgroundImage: tintStyles?.backgroundGradient,
        borderColor: tintStyles?.borderColor ?? 'rgba(255,255,255,0.08)',
        p: 2,
        overflow: 'hidden',
        '&:hover': {
          boxShadow: 'lg',
          borderColor: tintStyles?.hoverBorderColor ?? 'primary.500',
          transform: 'translateY(-2px)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: tintStyles?.hoverBorderColor ?? 'primary.500',
        },
      }}
      >
      {decorativeImageUrl && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            right: { xs: 0, sm: 0 },
            bottom: 0,
            left: { xs: 0, sm: 'auto' },
            width: { xs: '100%', sm: '45%', md: '45%' },
            pointerEvents: 'none',
            backgroundImage: `url(${decorativeImageUrl})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            transform: { xs: 'scale(0.97)', sm: 'scale(0.96)' },
            transformOrigin: { xs: 'center center', sm: 'center right' },
            backgroundPosition: { xs: 'center 18%', sm: 'right 22%' },
            opacity: { xs: 0.52, sm: 0.42 },
            filter: 'blur(1.6px) saturate(1.08) contrast(1.06)',
            clipPath: { xs: 'none', sm: 'polygon(20% 0, 100% 0, 100% 100%, 35% 100%)' },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: tintStyles?.decorativeOverlay
                ?? 'linear-gradient(to right, rgba(19, 10, 30, 0.98) 0%, rgba(19, 10, 30, 0.65) 28%, rgba(19, 10, 30, 0) 72%)',
            },
          }}
        />
      )}
      <CardContent
        sx={{
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 1.5, sm: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={{ xs: 0.75, sm: 2 }} sx={{ mb: 0.5 }}>
              <Typography level="title-md" sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.2 }}>
                {metadata.title}
              </Typography>
              {metadata.tags && metadata.tags.length > 0 && (
                <Chip
                  variant="soft"
                  color="primary"
                  size="sm"
                  startDecorator={<Tag size={12} />}
                  sx={{ height: 20 }}
                >
                  {metadata.tags[0]}
                </Chip>
              )}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ color: 'text.secondary' }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Calendar size={14} />
                <Typography level="body-xs" textColor="inherit">
                  {displayDate}
                </Typography>
              </Stack>

              {metadata.author && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <User size={14} />
                  <Typography level="body-xs" textColor="inherit">
                    {metadata.author}
                  </Typography>
                </Stack>
              )}

              <Typography level="body-xs" textColor="text.tertiary" sx={{ display: { xs: 'none', md: 'block' }, maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {metadata.summary}
              </Typography>
            </Stack>

            {secondaryCta}
          </Box>

          <Box sx={{ color: 'text.tertiary', display: { xs: 'none', sm: 'block' } }}>
            <ArrowRight size={18} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  // If href is provided, wrap in Next.js Link
  if (href) {
    return (
      <Link href={href} passHref legacyBehavior>
        <a style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          {cardContent}
        </a>
      </Link>
    );
  }

  return cardContent;
});

BlogCard.displayName = 'BlogCard';
