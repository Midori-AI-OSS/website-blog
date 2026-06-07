'use client';

import { Box, Stack, Typography } from '@mui/joy';
import { useEffect, useRef, useState } from 'react';
import type { ExtractedPalette } from '@/lib/theme/artPalette';
import {
  DEFAULT_ART_PALETTE,
  extractPaletteFromImage,
  hexToRgb,
  hslToRgb,
  rgbToHex,
  rgbToHsl,
} from '@/lib/theme/artPalette';

export interface GamePickerGame {
  slug: string;
  title: string;
  coverUrl: string | null;
}

interface GamePickerProps {
  games: GamePickerGame[];
}

function ensureReadableBackground(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luminance <= 150) return hex;
  // Too light — darken by reducing HSL lightness to 0.35
  const [h, s] = rgbToHsl(r, g, b);
  const [dr, dg, db] = hslToRgb(h, s, 0.35);
  return rgbToHex(dr, dg, db);
}

export function GamePicker({ games }: GamePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  /* ── Color extraction ────────────────────────────────── */
  useEffect(() => {
    for (const game of games) {
      if (!game.coverUrl) continue;

      extractPaletteFromImage(game.coverUrl).then((palette: ExtractedPalette) => {
        setColors((prev) => ({ ...prev, [game.slug]: ensureReadableBackground(palette.primary) }));
      });
    }
  }, [games]);

  /* ── IntersectionObserver for active-section tracking ── */
  useEffect(() => {
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slug = entry.target.id.replace('game-', '');
          ratios.set(slug, entry.intersectionRatio);
        }

        let bestSlug: string | null = null;
        let bestRatio = 0;
        for (const [slug, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestSlug = slug;
          }
        }
        setActiveSlug(bestSlug);
      },
      { threshold: [0, 0.25, 0.5, 0.75] },
    );

    for (const game of games) {
      const el = document.getElementById(`game-${game.slug}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [games]);

  /* ── Floaty parallax (delta) ──────────────────────────── */
  useEffect(() => {
    let prevScrollY = window.scrollY;
    let offset = 0;
    let rafId: number;

    const frame = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - prevScrollY;
      offset += delta * -0.08;
      offset *= 0.94;
      prevScrollY = currentScrollY;

      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(calc(-50% + ${offset}px))`;
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  /* ── Helpers ──────────────────────────────────────────── */
  const getColor = (slug: string): string => colors[slug] ?? DEFAULT_ART_PALETTE.primary;

  /* ── Render ───────────────────────────────────────────── */
  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        left: 16,
        top: '50%',
        display: { xs: 'none', xl: 'flex' },
        zIndex: 1000,
      }}
    >
      <Stack spacing={1}>
        {games.map((game) => {
          const isActive = activeSlug === game.slug;

          return (
            <Box
              key={game.slug}
              onClick={() => {
                document
                  .getElementById(`game-${game.slug}`)
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              sx={{
                width: 'auto',
                minWidth: 120,
                height: 28,
                borderRadius: 9999,
                px: 1.5,
                bgcolor: getColor(game.slug),
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                p: 0,
                ...(isActive && {
                  border: '2px solid rgba(255,255,255,0.9)',
                  transform: 'scale(1.08)',
                }),
                '&:hover': {
                  transform: 'scale(1.08)',
                },
              }}
            >
              <Typography
                level="body-xs"
                sx={{
                  color: 'common.white',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textShadow: '0 0 3px rgba(0,0,0,0.6)',
                }}
              >
                {game.title}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
