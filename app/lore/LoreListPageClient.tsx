'use client';

import { keyframes } from '@emotion/react';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  Option,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/joy';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AmbientCoverArt } from '@/components/blog/AmbientCoverArt';
import { BlogCard } from '@/components/blog/BlogCard';
import type { GamePickerGame } from '@/components/GamePicker';
import { GamePicker } from '@/components/GamePicker';
import type { ParsedPost } from '@/lib/blog/parser';
import { transformPostImageUrl } from '@/lib/content/imageUrl';
import type { LoreGameGroup } from '@/lib/lore/loader';

const fadeInFromRight = keyframes`
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const fadeInFromLeft = keyframes`
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

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

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 per page' },
  { value: 20, label: '20 per page' },
  { value: 100, label: '100 per page' },
  { value: Infinity, label: 'All' },
] as const;

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
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
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

  const firstPostCover = posts.find(
    (post) => typeof post.metadata.cover_image === 'string' && post.metadata.cover_image.trim(),
  )?.metadata.cover_image;
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
  const [pageSizeByGame, setPageSizeByGame] = useState<Record<string, number>>({});
  const [currentPageByGame, setCurrentPageByGame] = useState<Record<string, number>>({});
  const prevPageByGame = useRef<Record<string, number>>({});

  const groupsWithUiState = useMemo(() => {
    return gameGroups.map((group) => {
      const sortMode = sortByGame[group.game.slug] ?? 'story_order_desc';
      const selectedCharacter = characterByGame[group.game.slug] ?? '';
      const pageSize = pageSizeByGame[group.game.slug] ?? 10;
      const currentPage = currentPageByGame[group.game.slug] ?? 1;
      const sortedPosts = sortPosts(group.posts, sortMode);

      const filteredPosts = selectedCharacter
        ? sortedPosts.filter((post) => {
            const normalizedTags = (post.metadata.tags ?? []).map(normalizeTag);
            return normalizedTags.includes(normalizeTag(selectedCharacter));
          })
        : sortedPosts;

      const paginatedPosts =
        pageSize === Infinity
          ? filteredPosts
          : filteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

      const totalPages = pageSize === Infinity ? 1 : Math.ceil(filteredPosts.length / pageSize);

      return {
        ...group,
        sortMode,
        selectedCharacter,
        filteredPosts,
        paginatedPosts,
        pageSize,
        currentPage,
        totalPages,
        fullStoryHref: buildFullStoryHref(group.game.slug),
      };
    });
  }, [characterByGame, currentPageByGame, gameGroups, pageSizeByGame, sortByGame]);

  const pickerGames = useMemo<GamePickerGame[]>(() => {
    return gameGroups.map((group) => ({
      slug: group.game.slug,
      title: group.game.title,
      coverUrl: getGameCoverImage(group.game.coverImage, group.posts),
    }));
  }, [gameGroups]);

  useEffect(() => {
    for (const group of groupsWithUiState) {
      prevPageByGame.current[group.game.slug] = group.currentPage;
    }
  }, [groupsWithUiState]);

  // Hydrate page sizes from localStorage on mount
  useEffect(() => {
    const hydrated: Record<string, number> = {};
    for (const group of gameGroups) {
      const stored = localStorage.getItem(`lore-page-size-${group.game.slug}`);
      if (stored !== null) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed > 0) {
          hydrated[group.game.slug] = parsed;
        }
      }
    }
    if (Object.keys(hydrated).length > 0) {
      setPageSizeByGame((current) => ({ ...current, ...hydrated }));
    }
  }, [gameGroups]);

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
    <>
      <GamePicker games={pickerGames} />
      <Stack spacing={3}>
        {groupsWithUiState.map((group) => {
          const cover = getGameCoverImage(group.game.coverImage, group.posts);
          const povLabel = toSentenceCase(group.game.fullStoryPov.replace(/-/g, ' '));
          const prevPage = prevPageByGame.current[group.game.slug];
          let animationName: string | undefined;
          if (prevPage != null && group.currentPage !== prevPage) {
            animationName = group.currentPage > prevPage ? fadeInFromRight : fadeInFromLeft;
          } else {
            animationName = undefined;
          }

          return (
            <Box
              key={group.game.slug}
              id={`game-${group.game.slug}`}
              sx={{
                p: { xs: 1.25, sm: 2.25 },
                bgcolor: 'rgba(10, 12, 18, 0.72)',
                scrollMarginTop: '80px',
              }}
            >
              <Stack spacing={1.75} sx={{ minWidth: 0 }}>
                <Stack
                  direction={{ xs: 'column', xl: 'row' }}
                  spacing={{ xs: 1.25, xl: 1.5 }}
                  alignItems={{ xs: 'stretch', xl: 'flex-start' }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                      <Typography
                        level="h2"
                        sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem' }, lineHeight: 1.1 }}
                      >
                        {group.game.title}
                      </Typography>
                      <Chip size="sm" variant="soft" color="primary" sx={{ borderRadius: 0 }}>
                        POV: {povLabel}
                      </Chip>
                    </Stack>

                    <Typography
                      level="body-md"
                      sx={{
                        mt: 1,
                        color: 'text.secondary',
                        fontSize: { xs: '1rem', sm: '1.03rem' },
                        lineHeight: 1.6,
                      }}
                    >
                      {group.game.summary}
                    </Typography>
                  </Box>

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent={{ sm: 'flex-end' }}
                    sx={{
                      width: { xs: '100%', xl: 'auto' },
                      ml: { xl: 'auto' },
                      flexShrink: 0,
                    }}
                  >
                    <FormControl
                      size="sm"
                      sx={{ minWidth: { xs: '100%', sm: 250 }, flex: { sm: '0 0 250px' } }}
                    >
                      <Select
                        value={group.sortMode}
                        onChange={(_event, value) => {
                          if (!value) return;
                          setSortByGame((current) => ({
                            ...current,
                            [group.game.slug]: value,
                          }));
                          setCurrentPageByGame((current) => ({ ...current, [group.game.slug]: 1 }));
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

                    <FormControl
                      size="sm"
                      sx={{ minWidth: { xs: '100%', sm: 220 }, flex: { sm: '0 0 220px' } }}
                    >
                      <Select
                        value={group.selectedCharacter || ''}
                        onChange={(_event, value) => {
                          setCharacterByGame((current) => ({
                            ...current,
                            [group.game.slug]: value ?? '',
                          }));
                          setCurrentPageByGame((current) => ({ ...current, [group.game.slug]: 1 }));
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

                    <FormControl
                      size="sm"
                      sx={{ minWidth: { xs: '100%', sm: 140 }, flex: { sm: '0 0 140px' } }}
                    >
                      <Select
                        value={group.pageSize}
                        onChange={(_event, value) => {
                          if (value === null) return;
                          localStorage.setItem(`lore-page-size-${group.game.slug}`, String(value));
                          setPageSizeByGame((current) => ({
                            ...current,
                            [group.game.slug]: value,
                          }));
                          setCurrentPageByGame((current) => ({ ...current, [group.game.slug]: 1 }));
                        }}
                        aria-label={`Posts per page for ${group.game.title}`}
                        sx={{
                          minHeight: 44,
                          borderRadius: 0,
                          bgcolor: 'rgba(10, 12, 20, 0.82)',
                        }}
                      >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <Option key={String(option.value)} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>

                    <Tooltip
                      arrow
                      placement="top-start"
                      variant="soft"
                      title={group.game.fullStoryTooltip || `Read ${povLabel}'s full story`}
                      enterTouchDelay={0}
                    >
                      <Button
                        component={Link}
                        href={group.fullStoryHref}
                        variant="solid"
                        color="primary"
                        sx={{
                          minHeight: 44,
                          px: 2,
                          borderRadius: 0,
                          fontWeight: 700,
                          textTransform: 'none',
                          width: { xs: '100%', sm: 'auto' },
                          whiteSpace: 'nowrap',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
                </Stack>

                <Box sx={{ width: '100%', minWidth: 0 }}>
                  {cover ? (
                    <AmbientCoverArt
                      coverImageUrl={cover}
                      alt={`${group.game.title} cover`}
                      minHeight={{ xs: '100px', sm: '100px' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        minHeight: { xs: '100px', sm: '100px' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(30,34,50,0.4)',
                        color: 'text.secondary',
                      }}
                    >
                      <Typography level="body-sm">No cover art</Typography>
                    </Box>
                  )}
                </Box>
              </Stack>

              <Divider sx={{ my: 2.25, borderColor: 'rgba(255,255,255,0.1)' }} />

              <Stack
                key={`${group.game.slug}-${group.currentPage}`}
                spacing={1.25}
                sx={
                  animationName
                    ? {
                        animation: `${animationName} 280ms ease-out`,
                      }
                    : undefined
                }
              >
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
                  group.paginatedPosts.map((post) => {
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
                        postType="lore"
                        onClick={() => router.push(`/lore/${getPostSlug(post)}`)}
                        variant="outlined"
                      />
                    );
                  })
                )}
              </Stack>

              {group.totalPages > 1 && group.pageSize !== Infinity && (
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ mt: 2 }}
                >
                  {/* left arrow */}
                  <Box
                    component="button"
                    onClick={() => {
                      if (group.currentPage > 1) {
                        setCurrentPageByGame((current) => ({
                          ...current,
                          [group.game.slug]: group.currentPage - 1,
                        }));
                      }
                    }}
                    disabled={group.currentPage <= 1}
                    aria-label="Previous page"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      border: 'none',
                      bgcolor: 'transparent',
                      color:
                        group.currentPage <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                      cursor: group.currentPage <= 1 ? 'default' : 'pointer',
                      borderRadius: 0,
                      '&:hover': group.currentPage > 1 ? { color: '#8b5cf6' } : {},
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: '#8b5cf6',
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    <ChevronLeft size={20} strokeWidth={2} />
                  </Box>

                  {/* page dots */}
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {Array.from({ length: group.totalPages }, (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === group.currentPage;
                      return (
                        <Box
                          key={pageNum}
                          component="button"
                          onClick={() => {
                            setCurrentPageByGame((current) => ({
                              ...current,
                              [group.game.slug]: pageNum,
                            }));
                          }}
                          aria-label={`Page ${pageNum}`}
                          aria-current={isActive ? 'page' : undefined}
                          sx={{
                            border: 'none',
                            bgcolor: isActive ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
                            borderRadius: isActive ? '4px' : '50%',
                            width: isActive ? 24 : 8,
                            height: 8,
                            cursor: 'pointer',
                            p: 0,
                            m: 0,
                            transition: 'width 0.2s ease, background-color 0.2s ease',
                            '&:hover': {
                              bgcolor: isActive ? '#9b6dff' : 'rgba(255,255,255,0.4)',
                            },
                            '&:focus-visible': {
                              outline: '2px solid',
                              outlineColor: '#8b5cf6',
                              outlineOffset: '2px',
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>

                  {/* right arrow */}
                  <Box
                    component="button"
                    onClick={() => {
                      if (group.currentPage < group.totalPages) {
                        setCurrentPageByGame((current) => ({
                          ...current,
                          [group.game.slug]: group.currentPage + 1,
                        }));
                      }
                    }}
                    disabled={group.currentPage >= group.totalPages}
                    aria-label="Next page"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      border: 'none',
                      bgcolor: 'transparent',
                      color:
                        group.currentPage >= group.totalPages
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(255,255,255,0.7)',
                      cursor: group.currentPage >= group.totalPages ? 'default' : 'pointer',
                      borderRadius: 0,
                      '&:hover': group.currentPage < group.totalPages ? { color: '#8b5cf6' } : {},
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: '#8b5cf6',
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    <ChevronRight size={20} strokeWidth={2} />
                  </Box>
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>
    </>
  );
}
