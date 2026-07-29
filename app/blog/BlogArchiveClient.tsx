'use client';

import { keyframes } from '@emotion/react';
import { Box, Divider, FormControl, Option, Select, Stack, Typography } from '@mui/joy';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AmbientCoverArt } from '@/components/blog/AmbientCoverArt';
import { BlogCard } from '@/components/blog/BlogCard';
import {
  type ArchivePeriod,
  BLOG_PLACEHOLDER_URL,
  getPeriodImageCandidates,
  getPeriodTags,
} from '@/lib/blog/archive';
import type { ParsedPost } from '@/lib/blog/parser';

import {
  DEFAULT_PAGE_SIZE,
  getVisiblePageNumbers,
  parseStoredPageSize,
  serializePageSize,
} from './archiveUi';
import { BlogPeriodPicker, type PeriodPickerItem } from './BlogPeriodPicker';

const fadeInFromRight = keyframes`
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const fadeInFromLeft = keyframes`
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 per page' },
  { value: 20, label: '20 per page' },
  { value: 100, label: '100 per page' },
  { value: Infinity, label: 'All' },
] as const;

interface BlogArchiveClientProps {
  periods: ArchivePeriod[];
}

function getPostSlug(post: ParsedPost): string {
  return post.filename.replace(/\.md$/i, '');
}

export function BlogArchiveClient({ periods }: BlogArchiveClientProps) {
  const router = useRouter();
  const [selectedTagByPeriod, setSelectedTagByPeriod] = useState<Record<string, string>>({});
  const [pageSizeByPeriod, setPageSizeByPeriod] = useState<Record<string, number>>({});
  const [currentPageByPeriod, setCurrentPageByPeriod] = useState<Record<string, number>>({});
  const [coverErrorsByPeriod, setCoverErrorsByPeriod] = useState<Record<string, number>>({});
  const prevPageByPeriod = useRef<Record<string, number>>({});

  // ── Lazy mounting: mount 2 newest sections initially ──
  const [mountedKeys, setMountedKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // periods are sorted newest-first; mount the first 2
    for (let i = 0; i < Math.min(2, periods.length); i++) {
      const p = periods[i];
      if (p) initial.add(p.key);
    }
    return initial;
  });

  const mountPeriod = useCallback((key: string) => {
    setMountedKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const handleSelectPeriod = useCallback(
    (slug: string) => {
      mountPeriod(slug);
    },
    [mountPeriod],
  );

  // IntersectionObserver for lazy-mounting placeholders
  const mountPeriodRef = useRef(mountPeriod);
  mountPeriodRef.current = mountPeriod;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const slug = entry.target.id.replace('period-', '');
          mountPeriodRef.current(slug);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '400px 0px' },
    );

    const placeholders = document.querySelectorAll<HTMLElement>(
      '[id^="period-"][data-lazy="true"]',
    );
    for (const el of placeholders) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const periodsWithUi = useMemo(() => {
    return periods.map((period) => {
      const selectedTag = selectedTagByPeriod[period.key] ?? '';
      const pageSize = pageSizeByPeriod[period.key] ?? DEFAULT_PAGE_SIZE;
      const currentPage = currentPageByPeriod[period.key] ?? 1;
      const coverErrorIndex = coverErrorsByPeriod[period.key] ?? 0;

      // Filter by selected tag
      const filteredPosts = selectedTag
        ? period.posts.filter((post) => {
            const normalizedTags = (post.metadata.tags ?? []).map((t) => t.trim().toLowerCase());
            return normalizedTags.includes(selectedTag.toLowerCase());
          })
        : period.posts;

      const totalFiltered = filteredPosts.length;
      const totalPages = pageSize === Infinity ? 1 : Math.ceil(totalFiltered / pageSize);

      const paginatedPosts =
        pageSize === Infinity
          ? filteredPosts
          : filteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

      // Resolve cover image: try candidates, fall back to placeholder when exhausted
      const imageCandidates = getPeriodImageCandidates(period.newestMonth, period.year);
      const coverImageUrl: string =
        imageCandidates.length > 0 && coverErrorIndex < imageCandidates.length
          ? // biome-ignore lint/style/noNonNullAssertion: bounded by length check
            imageCandidates[coverErrorIndex]!
          : BLOG_PLACEHOLDER_URL;

      // Tags for this period (from unfiltered posts)
      const tags = getPeriodTags(period.posts);

      return {
        ...period,
        selectedTag,
        filteredPosts,
        paginatedPosts,
        pageSize,
        currentPage,
        totalPages,
        totalFiltered,
        visiblePageNumbers: getVisiblePageNumbers(totalPages, currentPage),
        coverImageUrl,
        coverErrorIndex,
        tags,
      };
    });
  }, [periods, selectedTagByPeriod, pageSizeByPeriod, currentPageByPeriod, coverErrorsByPeriod]);

  // Hide empty filtered groups
  const visiblePeriods = periodsWithUi.filter(
    (p) => p.totalFiltered > 0 || !selectedTagByPeriod[p.key],
  );

  // Build picker items
  const pickerItems = useMemo<PeriodPickerItem[]>(() => {
    return visiblePeriods.map((period) => {
      const candidates = getPeriodImageCandidates(period.newestMonth, period.year);
      const primary = candidates[0] ?? null;
      return {
        slug: period.key,
        title: period.pickerLabel,
        coverUrl: primary,
      };
    });
  }, [visiblePeriods]);

  // Track previous page for animation direction
  useEffect(() => {
    for (const period of periodsWithUi) {
      prevPageByPeriod.current[period.key] = period.currentPage;
    }
  }, [periodsWithUi]);

  // Hydrate page sizes from localStorage
  useEffect(() => {
    const hydrated: Record<string, number> = {};
    for (const period of periods) {
      const stored = localStorage.getItem(`blog-archive-page-size-${period.key}`);
      const parsed = parseStoredPageSize(stored);
      if (parsed !== null) {
        hydrated[period.key] = parsed;
      }
    }
    if (Object.keys(hydrated).length > 0) {
      setPageSizeByPeriod((current) => ({ ...current, ...hydrated }));
    }
  }, [periods]);

  const handleCoverError = (periodKey: string, currentIndex: number) => {
    setCoverErrorsByPeriod((prev) => ({
      ...prev,
      [periodKey]: currentIndex + 1,
    }));
  };

  if (periods.length === 0) {
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
          No blog posts found.
        </Typography>
        <Typography level="body-md" sx={{ color: 'text.secondary' }}>
          Add markdown posts under blog/posts/ to populate this page.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <BlogPeriodPicker periods={pickerItems} onSelectPeriod={handleSelectPeriod} />
      <Stack spacing={3}>
        {visiblePeriods.map((period) => {
          const isMounted = mountedKeys.has(period.key);

          if (!isMounted) {
            // Placeholder: keeps the section in the DOM for picker IntersectionObserver
            return (
              <Box
                key={period.key}
                id={`period-${period.key}`}
                data-lazy="true"
                sx={{
                  p: { xs: 1.25, sm: 2.25 },
                  bgcolor: 'rgba(10, 12, 18, 0.72)',
                  scrollMarginTop: '80px',
                  minHeight: '120px',
                }}
              />
            );
          }

          const prevPage = prevPageByPeriod.current[period.key];
          let animationName: string | undefined;
          if (prevPage != null && period.currentPage !== prevPage) {
            animationName = period.currentPage > prevPage ? fadeInFromRight : fadeInFromLeft;
          } else {
            animationName = undefined;
          }

          return (
            <Box
              key={period.key}
              id={`period-${period.key}`}
              sx={{
                p: { xs: 1.25, sm: 2.25 },
                bgcolor: 'rgba(10, 12, 18, 0.72)',
                scrollMarginTop: '80px',
              }}
            >
              <Stack spacing={1.75} sx={{ minWidth: 0 }}>
                {/* Header row: title + controls */}
                <Stack
                  direction={{ xs: 'column', xl: 'row' }}
                  spacing={{ xs: 1.25, xl: 1.5 }}
                  alignItems={{ xs: 'stretch', xl: 'flex-start' }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      level="h2"
                      sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem' }, lineHeight: 1.1 }}
                    >
                      {period.label}
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
                    {/* Tag filter */}
                    <FormControl
                      size="sm"
                      sx={{ minWidth: { xs: '100%', sm: 180 }, flex: { sm: '0 0 180px' } }}
                    >
                      <Select
                        value={period.selectedTag || ''}
                        onChange={(_event, value) => {
                          setSelectedTagByPeriod((current) => ({
                            ...current,
                            [period.key]: value ?? '',
                          }));
                          setCurrentPageByPeriod((current) => ({
                            ...current,
                            [period.key]: 1,
                          }));
                        }}
                        aria-label={`Filter ${period.label} by tag`}
                        sx={{
                          minHeight: 44,
                          borderRadius: 0,
                          bgcolor: 'rgba(10, 12, 20, 0.82)',
                        }}
                      >
                        <Option value="">All tags</Option>
                        {period.tags.map((tag) => (
                          <Option key={tag} value={tag}>
                            {tag}
                          </Option>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Page size */}
                    <FormControl
                      size="sm"
                      sx={{ minWidth: { xs: '100%', sm: 140 }, flex: { sm: '0 0 140px' } }}
                    >
                      <Select
                        value={period.pageSize}
                        onChange={(_event, value) => {
                          if (value === null) return;
                          localStorage.setItem(
                            `blog-archive-page-size-${period.key}`,
                            serializePageSize(value),
                          );
                          setPageSizeByPeriod((current) => ({
                            ...current,
                            [period.key]: value,
                          }));
                          setCurrentPageByPeriod((current) => ({
                            ...current,
                            [period.key]: 1,
                          }));
                        }}
                        aria-label={`Posts per page for ${period.label}`}
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
                  </Stack>
                </Stack>

                {/* Cover image — always render with AmbientCoverArt (falls back to placeholder) */}
                <Box sx={{ width: '100%', minWidth: 0 }}>
                  <AmbientCoverArt
                    coverImageUrl={period.coverImageUrl}
                    alt={`${period.label} cover art`}
                    minHeight={{ xs: '100px', sm: '100px' }}
                    onImageError={() => handleCoverError(period.key, period.coverErrorIndex)}
                  />
                </Box>
              </Stack>

              <Divider sx={{ my: 2.25, borderColor: 'rgba(255,255,255,0.1)' }} />

              {/* Post cards */}
              <Stack
                key={`${period.key}-${period.currentPage}`}
                spacing={1.25}
                sx={
                  animationName
                    ? {
                        animation: `${animationName} 280ms ease-out`,
                      }
                    : undefined
                }
              >
                {period.filteredPosts.length === 0 && selectedTagByPeriod[period.key] ? (
                  <Box
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'rgba(255,255,255,0.1)',
                      bgcolor: 'rgba(8, 10, 15, 0.5)',
                    }}
                  >
                    <Typography level="body-md" sx={{ color: 'text.secondary' }}>
                      No posts match this tag filter.
                    </Typography>
                  </Box>
                ) : (
                  period.paginatedPosts.map((post) => (
                    <BlogCard
                      key={post.filename}
                      post={post}
                      postType="blog"
                      hideDate
                      onClick={() => router.push(`/blog/${getPostSlug(post)}`)}
                      variant="outlined"
                    />
                  ))
                )}
              </Stack>

              {/* Pagination controls — 44x44 touch targets on phone */}
              {period.totalPages > 1 && period.pageSize !== Infinity && (
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  justifyContent="center"
                  useFlexGap
                  sx={{
                    mt: 2,
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    rowGap: 0.75,
                    maxWidth: '100%',
                  }}
                >
                  <Box
                    component="button"
                    onClick={() => {
                      if (period.currentPage > 1) {
                        setCurrentPageByPeriod((current) => ({
                          ...current,
                          [period.key]: period.currentPage - 1,
                        }));
                      }
                    }}
                    disabled={period.currentPage <= 1}
                    aria-label="Previous page"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: { xs: '44px', sm: '28px' },
                      minHeight: { xs: '44px', sm: '28px' },
                      width: { xs: '44px', sm: '28px' },
                      height: { xs: '44px', sm: '28px' },
                      border: 'none',
                      bgcolor: 'transparent',
                      color:
                        period.currentPage <= 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                      cursor: period.currentPage <= 1 ? 'default' : 'pointer',
                      borderRadius: 0,
                      '&:hover': period.currentPage > 1 ? { color: '#8b5cf6' } : {},
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: '#8b5cf6',
                        outlineOffset: '2px',
                      },
                    }}
                  >
                    <ChevronLeft size={20} strokeWidth={2} />
                  </Box>

                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    useFlexGap
                    sx={{
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      justifyContent: 'center',
                      rowGap: 0.75,
                      maxWidth: '100%',
                    }}
                  >
                    {period.visiblePageNumbers.map((pageNum) => {
                      const isActive = pageNum === period.currentPage;
                      return (
                        <Box
                          key={pageNum}
                          component="button"
                          onClick={() => {
                            setCurrentPageByPeriod((current) => ({
                              ...current,
                              [period.key]: pageNum,
                            }));
                          }}
                          aria-label={`Go to page ${pageNum}`}
                          aria-current={isActive ? 'page' : undefined}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            bgcolor: isActive ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
                            borderRadius: isActive ? '4px' : '50%',
                            minWidth: { xs: '44px', sm: isActive ? '24px' : '8px' },
                            minHeight: { xs: '44px', sm: '8px' },
                            width: { xs: '44px', sm: isActive ? '24px' : '8px' },
                            height: { xs: '44px', sm: '8px' },
                            cursor: 'pointer',
                            p: 0,
                            m: 0,
                            transition:
                              'width 0.2s ease, min-width 0.2s ease, background-color 0.2s ease',
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

                  <Box
                    component="button"
                    onClick={() => {
                      if (period.currentPage < period.totalPages) {
                        setCurrentPageByPeriod((current) => ({
                          ...current,
                          [period.key]: period.currentPage + 1,
                        }));
                      }
                    }}
                    disabled={period.currentPage >= period.totalPages}
                    aria-label="Next page"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: { xs: '44px', sm: '28px' },
                      minHeight: { xs: '44px', sm: '28px' },
                      width: { xs: '44px', sm: '28px' },
                      height: { xs: '44px', sm: '28px' },
                      border: 'none',
                      bgcolor: 'transparent',
                      color:
                        period.currentPage >= period.totalPages
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(255,255,255,0.7)',
                      cursor: period.currentPage >= period.totalPages ? 'default' : 'pointer',
                      borderRadius: 0,
                      '&:hover': period.currentPage < period.totalPages ? { color: '#8b5cf6' } : {},
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
