'use client';

import { keyframes } from '@emotion/react';
import { Box, Stack, Tooltip, Typography } from '@mui/joy';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';

const breathePulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
`;

const breathePulseInverse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.9615); }
`;

export interface StoryPickerStory {
  slug: string;
  title: string;
  summary?: string;
  coverImage?: string;
}

interface StoryPickerProps {
  stories: StoryPickerStory[];
  gameCoverImage?: string;
}

function buildTooltipText(story: StoryPickerStory): string {
  const summary = (story.summary ?? '').trim();
  if (!summary) return story.title;
  const snippet = summary.length > 110 ? `${summary.slice(0, 109).trimEnd()}…` : summary;
  return `${story.title} - ${snippet}`;
}

export function StoryPicker({ stories, gameCoverImage }: StoryPickerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const breatheTimings = useMemo(() => {
    const map = new Map<string, { dur: number; delay: number }>();
    for (const story of stories) {
      map.set(story.slug, {
        dur: 3.5 + Math.random() * 3,
        delay: Math.random() * 4,
      });
    }
    return map;
  }, [stories]);

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

  if (stories.length === 0) return null;

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
        {stories.map((story) => {
          const timing = breatheTimings.get(story.slug) ?? { dur: 5, delay: 0 };
          const coverUrl = story.coverImage ?? gameCoverImage;

          return (
            <Tooltip
              key={story.slug}
              arrow
              variant="soft"
              title={buildTooltipText(story)}
              placement="right"
              enterTouchDelay={0}
            >
              <Box
                onClick={() => router.push(`/lore/${story.slug}`)}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 9999,
                  width: 'auto',
                  minWidth: 100,
                  maxWidth: 130,
                  height: 28,
                  px: 2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0,
                  transition: 'box-shadow 0.2s ease, filter 0.2s ease',
                  ...(!coverUrl && { bgcolor: '#8b5cf6' }),
                  '&:hover': {
                    filter: 'brightness(1.15)',
                  },
                  animation: `${breathePulse} ${timing.dur}s ease-in-out ${timing.delay}s infinite`,
                  ...(coverUrl && {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: -4,
                      backgroundImage: `url(${coverUrl})`,
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
                <Typography
                  level="body-xs"
                  sx={{
                    position: 'relative',
                    zIndex: 2,
                    color: 'common.white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    animation: `${breathePulseInverse} ${timing.dur}s ease-in-out ${timing.delay}s infinite`,
                  }}
                >
                  {story.title}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}
