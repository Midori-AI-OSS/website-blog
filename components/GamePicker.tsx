'use client';

import { Box, Stack, Typography } from '@mui/joy';
import { useEffect, useRef, useState } from 'react';
import type { ExtractedPalette } from '@/lib/theme/artPalette';
import { DEFAULT_ART_PALETTE, extractPaletteFromImage } from '@/lib/theme/artPalette';

export interface GamePickerGame {
  slug: string;
  title: string;
  coverUrl: string | null;
}

interface GamePickerProps {
  games: GamePickerGame[];
}

export function GamePicker({ games }: GamePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentY = useRef(0);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  /* ── Color extraction ────────────────────────────────── */
  useEffect(() => {
    for (const game of games) {
      if (!game.coverUrl) continue;

      extractPaletteFromImage(game.coverUrl).then((palette: ExtractedPalette) => {
        setColors((prev) => ({ ...prev, [game.slug]: palette.primary }));
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

  /* ── Floaty parallax (lerp) ──────────────────────────── */
  useEffect(() => {
    let rafId: number;

    const frame = () => {
      const targetY = window.scrollY;
      currentY.current += (targetY - currentY.current) * 0.08;

      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(calc(-50% + ${currentY.current * 0.3}px))`;
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
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: getColor(game.slug),
                cursor: 'pointer',
                transition: 'width 0.25s ease, padding 0.25s ease, border-radius 0.25s ease',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                p: 0,
                ...(isActive && {
                  border: '2px solid rgba(255,255,255,0.9)',
                  transform: 'scale(1.15)',
                }),
                '&:hover': {
                  width: 120,
                  height: 28,
                  borderRadius: 9999,
                  px: 1.5,
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
