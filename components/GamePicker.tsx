'use client';

import { keyframes } from '@emotion/react';
import { Box, Stack, Typography } from '@mui/joy';
import { useEffect, useMemo, useRef, useState } from 'react';

const breathePulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
`;

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
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  /* ── Randomized breathing timings ────────────────────── */
  const breatheTimings = useMemo(() => {
    const map = new Map<string, { dur: number; delay: number }>();
    for (const game of games) {
      map.set(game.slug, {
        dur: 3.5 + Math.random() * 3,
        delay: Math.random() * 4,
      });
    }
    return map;
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
          const timing = breatheTimings.get(game.slug) ?? { dur: 5, delay: 0 };

          return (
            <Box
              key={game.slug}
              onClick={() => {
                document
                  .getElementById(`game-${game.slug}`)
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 9999,
                width: 'auto',
                minWidth: 120,
                height: 28,
                px: 1.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 0,
                transition: 'box-shadow 0.2s ease, filter 0.2s ease',
                ...(!game.coverUrl && { bgcolor: '#8b5cf6' }),
                ...(isActive && {
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
                }),
                '&:hover': {
                  filter: 'brightness(1.15)',
                },
                ...(game.coverUrl && {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -4,
                    backgroundImage: `url(${game.coverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(8px)',
                    zIndex: 0,
                    animation: `${breathePulse} ${timing.dur}s ease-in-out ${timing.delay}s infinite`,
                  },
                }),
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.35)',
                  borderRadius: 9999,
                  zIndex: 1,
                  animation: `${breathePulse} ${timing.dur}s ease-in-out ${timing.delay}s infinite`,
                },
              }}
            >
              <Typography
                level="body-xs"
                sx={{
                  position: 'relative',
                  zIndex: 2,
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
