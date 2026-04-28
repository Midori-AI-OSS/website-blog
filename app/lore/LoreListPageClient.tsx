'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControl,
  Option,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/joy';

import { BlogCard } from '@/components/blog/BlogCard';
import type { ParsedPost } from '@/lib/blog/parser';
import { transformPostImageUrl } from '@/lib/content/imageUrl';
import type { LoreGameGroup } from '@/lib/lore/loader';

type SortMode = 'story_order_desc' | 'story_order_asc' | 'date_desc' | 'date_asc';

interface LoreListPageClientProps {
  gameGroups: LoreGameGroup[];
}

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'story_order_desc', label: 'Story Order (Newest First)' },
  { value: 'story_order_asc', label: 'Story Order (Oldest First)' },
  { value: 'date_desc', label: 'Publish Date (Newest First)' },
  { value: 'date_asc', label: 'Publish Date (Oldest First)' },
];

function parseDateUtcMs(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const ms = Date.UTC(year, month - 1, day);
  const candidate = new Date(ms);
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
    return null;
  }
  return ms;
}

function compareByDateDesc(a: ParsedPost, b: ParsedPost): number {
  const aMs = parseDateUtcMs(a.metadata.date);
  const bMs = parseDateUtcMs(b.metadata.date);
  if (aMs === null && bMs === null) return a.filename.localeCompare(b.filename);
  if (aMs === null) return 1;
  if (bMs === null) return -1;
  if (aMs !== bMs) return bMs - aMs;
  return a.filename.localeCompare(b.filename);
}

function compareByStoryOrderAsc(a: ParsedPost, b: ParsedPost): number {
  const aOrder = typeof a.metadata.story_order === 'number' ? a.metadata.story_order : null;
  const bOrder = typeof b.metadata.story_order === 'number' ? b.metadata.story_order : null;
  if (aOrder === null && bOrder === null) return compareByDateDesc(b, a);
  if (aOrder === null) return 1;
  if (bOrder === null) return -1;
  if (aOrder !== bOrder) return aOrder - bOrder;

  const aMs = parseDateUtcMs(a.metadata.date);
  const bMs = parseDateUtcMs(b.metadata.date);
  if (aMs !== null && bMs !== null && aMs !== bMs) return aMs - bMs;
  return a.filename.localeCompare(b.filename);
}

function sortPosts(posts: ParsedPost[], mode: SortMode): ParsedPost[] {
  const sorted = [...posts];

  switch (mode) {
    case 'story_order_asc':
      sorted.sort(compareByStoryOrderAsc);
      return sorted;
    case 'story_order_desc':
      sorted.sort((a, b) => compareByStoryOrderAsc(b, a));
      return sorted;
    case 'date_asc':
      sorted.sort((a, b) => compareByDateDesc(b, a));
      return sorted;
    case 'date_desc':
    default:
      sorted.sort(compareByDateDesc);
      return sorted;
  }
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function getPostSlug(post: ParsedPost): string {
  return post.filename.replace(/\.md$/i, '');
}

function toSentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function summarySnippet(text: string | undefined, maxLen: number = 110): string {
  const source = (text ?? '').trim();
  if (!source) return 'Open this story arc view.';
  if (source.length <= maxLen) return source;
  return `${source.slice(0, maxLen - 1).trimEnd()}…`;
}

function getVisibleTags(post: ParsedPost, gameSlug: string): string[] {
  const game = normalizeTag(gameSlug);
  return (post.metadata.tags ?? []).filter((tag) => {
    const normalized = normalizeTag(tag);
    if (!normalized) return false;
    if (normalized === 'lore') return false;
    if (normalized === game) return false;
    return true;
  });
}

function getGameCoverImage(gameCoverImage: string | undefined, posts: ParsedPost[]): string | null {
  if (typeof gameCoverImage === 'string' && gameCoverImage.trim()) {
    return transformPostImageUrl(gameCoverImage.trim());
  }

  const firstPostCover = posts.find((post) => typeof post.metadata.cover_image === 'string' && post.metadata.cover_image.trim())?.metadata.cover_image;
  if (!firstPostCover) return null;
  return transformPostImageUrl(firstPostCover);
}

function buildFullStoryHref(gameSlug: string): string {
  return `/lore/game/${gameSlug}/full-story`;
}

export function LoreListPageClient({ gameGroups }: LoreListPageClientProps) {
  const router = useRouter();
  const [sortByGame, setSortByGame] = useState<Record<string, SortMode>>({});
  const [characterByGame, setCharacterByGame] = useState<Record<string, string>>({});

  const groupsWithUiState = useMemo(() => {
    return gameGroups.map((group) => {
      const sortMode = sortByGame[group.game.slug] ?? 'story_order_desc';
      const selectedCharacter = characterByGame[group.game.slug] ?? '';
      const sortedPosts = sortPosts(group.posts, sortMode);

      const filteredPosts = selectedCharacter
        ? sortedPosts.filter((post) => {
            const normalizedTags = (post.metadata.tags ?? []).map(normalizeTag);
            return normalizedTags.includes(normalizeTag(selectedCharacter));
          })
        : sortedPosts;

      return {
        ...group,
        sortMode,
        selectedCharacter,
        filteredPosts,
        fullStoryHref: buildFullStoryHref(group.game.slug),
        fullStoryTooltip: `${group.game.title} — ${summarySnippet(group.game.summary)}`,
      };
    });
  }, [characterByGame, gameGroups, sortByGame]);

  if (groupsWithUiState.length === 0) {
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.1)',
          bgcolor: 'rgba(8,10,15,0.6)',
        }}
      >
        <Typography level="title-lg" sx={{ mb: 1 }}>
          No lore game containers found.
        </Typography>
        <Typography level="body-md" sx={{ color: 'text.secondary' }}>
          Add game index files under `lore/games/&lt;game-slug&gt;/index.md` to populate this page.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {groupsWithUiState.map((group) => {
        const cover = getGameCoverImage(group.game.coverImage, group.posts);
        const povLabel = toSentenceCase(group.game.fullStoryPov.replace(/-/g, ' '));

        return (
          <Card
            key={group.game.slug}
            variant="outlined"
            sx={{
              p: { xs: 1.25, sm: 2.25 },
              borderRadius: 0,
              borderColor: 'rgba(255,255,255,0.14)',
              bgcolor: 'rgba(10, 12, 18, 0.72)',
              overflow: 'hidden',
              transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 18px 38px rgba(8, 10, 18, 0.5)',
                borderColor: 'rgba(107, 156, 255, 0.58)',
              },
            }}
          >
            <Stack spacing={1.75} sx={{ minWidth: 0 }}>
              <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                <Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                    <Typography level="h2" sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem' }, lineHeight: 1.1 }}>
                      {group.game.title}
                    </Typography>
                    <Chip size="sm" variant="soft" color="primary" sx={{ borderRadius: 0 }}>
                      POV: {povLabel}
                    </Chip>
                  </Stack>

                  <Typography level="body-md" sx={{ mt: 1, color: 'text.secondary', fontSize: { xs: '1rem', sm: '1.03rem' }, lineHeight: 1.6 }}>
                    {group.game.summary}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ width: '100%', minWidth: 0 }}>
                <Card
                  variant="plain"
                  sx={{
                    p: 0,
                    bgcolor: 'rgba(6,8,14,0.88)',
                    borderRadius: 0,
                    border: '1px solid',
                    borderColor: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                    minHeight: { xs: 240, sm: 320 },
                    position: 'relative',
                    '--Card-padding': '0px',
                  }}
                >
                  {cover ? (
                    <>
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
                        src={cover}
                        alt=""
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: 'blur(20px) brightness(0.55)',
                          transform: 'scale(1.08)',
                          zIndex: 0,
                          opacity: 0.84,
                        }}
                      />
                      <Box
                        component="img"
                        src={cover}
                        alt={`${group.game.title} cover`}
                        sx={{
                          position: 'relative',
                          zIndex: 1,
                          objectFit: 'contain',
                          maxWidth: { xs: '29%', sm: '20%' },
                          maxHeight: { xs: '23%', sm: '24%' },
                          width: 'auto',
                          height: 'auto',
                          display: 'block',
                          mx: 'auto',
                          mt: { xs: 1.25, sm: 1.5 },
                        }}
                      />
                    </>
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(30,34,50,0.78)',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography level="body-sm">No cover art</Typography>
                    </Box>
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 20,
                      px: { xs: 1, sm: 1.25 },
                      py: { xs: 1, sm: 1.25 },
                      background: 'linear-gradient(to top, rgba(2,4,10,0.9) 0%, rgba(2,4,10,0.7) 65%, rgba(2,4,10,0) 100%)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={1}
                      alignItems={{ xs: 'stretch', md: 'center' }}
                    >
                      <FormControl size="sm" sx={{ minWidth: { xs: '100%', md: 250 }, flex: { md: '0 0 250px' } }}>
                        <Select
                          value={group.sortMode}
                          onChange={(_event, value) => {
                            if (!value) return;
                            setSortByGame((current) => ({
                              ...current,
                              [group.game.slug]: value,
                            }));
                          }}
                          aria-label={`Sort ${group.game.title} stories`}
                          sx={{
                            minHeight: 44,
                            borderRadius: 0,
                            bgcolor: 'rgba(10, 12, 20, 0.82)',
                          }}
                        >
                          {SORT_OPTIONS.map((option) => (
                            <Option key={option.value} value={option.value}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl size="sm" sx={{ minWidth: { xs: '100%', md: 220 }, flex: { md: '0 0 220px' } }}>
                        <Select
                          value={group.selectedCharacter || ''}
                          onChange={(_event, value) => {
                            setCharacterByGame((current) => ({
                              ...current,
                              [group.game.slug]: value ?? '',
                            }));
                          }}
                          aria-label={`Filter ${group.game.title} by character`}
                          sx={{
                            minHeight: 44,
                            borderRadius: 0,
                            bgcolor: 'rgba(10, 12, 20, 0.82)',
                          }}
                        >
                          <Option value="">All characters</Option>
                          {group.characters.map((character) => (
                            <Option key={character} value={character}>
                              {toSentenceCase(character)}
                            </Option>
                          ))}
                        </Select>
                      </FormControl>

                      <Tooltip
                        arrow
                        placement="top-start"
                        variant="soft"
                        title={group.fullStoryTooltip}
                        enterTouchDelay={0}
                      >
                        <Button
                          component="a"
                          href={group.fullStoryHref}
                          variant="solid"
                          color="primary"
                          sx={{
                            minHeight: 44,
                            px: 2,
                            borderRadius: 0,
                            fontWeight: 700,
                            textTransform: 'none',
                            width: { xs: '100%', md: 'auto' },
                            whiteSpace: 'nowrap',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: 'md',
                            },
                            '&:focus-visible': {
                              outline: '2px solid',
                              outlineColor: 'primary.500',
                              outlineOffset: '2px',
                            },
                          }}
                        >
                          Read {povLabel}&apos;s full story
                        </Button>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Card>
              </Box>
            </Stack>

            <Divider sx={{ my: 2.25, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Stack spacing={1.25}>
              {group.filteredPosts.length === 0 ? (
                <Box
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'rgba(255,255,255,0.1)',
                    bgcolor: 'rgba(8, 10, 15, 0.5)',
                  }}
                >
                  <Typography level="body-md" sx={{ color: 'text.secondary' }}>
                    No stories match this character filter yet.
                  </Typography>
                </Box>
              ) : (
                group.filteredPosts.map((post) => {
                  const visibleTags = getVisibleTags(post, group.game.slug);
                  const cardPost: ParsedPost = {
                    ...post,
                    metadata: {
                      ...post.metadata,
                      tags: visibleTags,
                    },
                  };

                  return (
                    <BlogCard
                      key={post.filename}
                      post={cardPost}
                      onClick={() => router.push(`/lore/${getPostSlug(post)}`)}
                      variant="outlined"
                    />
                  );
                })
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
