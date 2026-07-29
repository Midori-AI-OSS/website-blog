'use client';

import { keyframes } from '@emotion/react';
import { Box, Stack, Typography } from '@mui/joy';
import { useEffect, useMemo, useRef, useState } from 'react';

const VISIBLE_CAP = 10;
const HALF_WINDOW = Math.floor(VISIBLE_CAP / 2);

const breathePulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
`;

const breathePulseInverse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.9615); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export interface PeriodPickerItem {
  slug: string;
  title: string;
  coverUrl: string | null;
}

interface PeriodPickerProps {
  periods: PeriodPickerItem[];
  onSelectPeriod?: (slug: string) => void;
}

function hashSlug(slug: string): number {
  let hash = 0;
  for (const char of slug) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

export function getPeriodBreatheTiming(slug: string): { dur: number; delay: number } {
  const hash = hashSlug(slug);
  return {
    dur: 3.5 + (hash % 300) / 100,
    delay: ((hash >>> 8) % 400) / 100,
  };
}

export function BlogPeriodPicker({ periods, onSelectPeriod }: PeriodPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [coverErrors, setCoverErrors] = useState<Set<string>>(new Set());

  const breatheTimings = useMemo(() => {
    const map = new Map<string, { dur: number; delay: number }>();
    for (const period of periods) {
      map.set(period.slug, getPeriodBreatheTiming(period.slug));
    }
    return map;
  }, [periods]);

  const visibleCount = Math.min(periods.length, VISIBLE_CAP);
  const windowing = periods.length > VISIBLE_CAP;

  const windowStart = useMemo(() => {
    if (!windowing || activeSlug === null) return 0;
    const activeIndex = periods.findIndex((g) => g.slug === activeSlug);
    if (activeIndex < 0) return 0;
    if (activeIndex <= 1) return 0;
    if (activeIndex >= periods.length - 2) return periods.length - VISIBLE_CAP;
    return activeIndex - HALF_WINDOW;
  }, [activeSlug, periods, windowing]);

  const prevWindowStartRef = useRef(windowStart);
  useEffect(() => {
    prevWindowStartRef.current = windowStart;
  });

  useEffect(() => {
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const slug = entry.target.id.replace('period-', '');
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

    for (const period of periods) {
      const el = document.getElementById(`period-${period.slug}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [periods]);

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

  const handleCoverError = (slug: string) => {
    setCoverErrors((prev) => {
      const next = new Set(prev);
      next.add(slug);
      return next;
    });
  };

  const visiblePeriods = periods.slice(windowStart, windowStart + visibleCount);

  if (periods.length === 0) return null;

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
        {visiblePeriods.map((period) => {
          const isActive = activeSlug === period.slug;
          const timing = breatheTimings.get(period.slug) ?? { dur: 5, delay: 0 };
          const coverFailed = coverErrors.has(period.slug);
          const effectiveCover = !coverFailed && period.coverUrl ? period.coverUrl : null;

          return (
            <Box
              key={period.slug}
              sx={windowing ? { animation: `${slideIn} 0.3s ease-out` } : undefined}
            >
              <Box
                component="button"
                type="button"
                onClick={() => {
                  onSelectPeriod?.(period.slug);
                  document
                    .getElementById(`period-${period.slug}`)
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
                  border: 0,
                  font: 'inherit',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  transition: 'box-shadow 0.2s ease, filter 0.2s ease',
                  ...(!effectiveCover && { bgcolor: '#8b5cf6' }),
                  ...(isActive && {
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
                  }),
                  '&:hover': {
                    filter: 'brightness(1.15)',
                  },
                  '&:focus-visible': {
                    outline: '2px solid rgba(255,255,255,0.95)',
                    outlineOffset: '2px',
                  },
                  animation: `${breathePulse} ${timing.dur}s ease-in-out ${timing.delay}s infinite`,
                  ...(effectiveCover && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: -4,
                      backgroundImage: `url(${effectiveCover})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(8px)',
                      zIndex: 0,
                    },
                  }),
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.35)',
                    borderRadius: 9999,
                    zIndex: 1,
                  },
                }}
              >
                {period.coverUrl && !coverFailed && (
                  <Box
                    component="img"
                    src={period.coverUrl}
                    alt=""
                    onError={() => handleCoverError(period.slug)}
                    sx={{ display: 'none' }}
                  />
                )}
                <Typography
                  level="body-xs"
                  sx={{
                    position: 'relative',
                    zIndex: 2,
                    color: 'common.white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    animation: `${breathePulseInverse} ${timing.dur}s ease-in-out ${timing.delay}s infinite`,
                  }}
                >
                  {period.title}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
