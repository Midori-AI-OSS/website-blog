'use client';

/**
 * BlogList Component
 * 
 * A component that displays blog cards in a vertical stack with lazy loading.
 * Features:
 * - Vertical stack layout (single column)
 * - Lazy loading with Intersection Observer for infinite scroll
 * - Initial batch of 10 posts with progressive loading
 * - Loading states (initial, loading more, error)
 * - Empty state handling
 * - Full accessibility with ARIA live regions and focus management
 * - Works with both SSG (static) and CSR (client-side) data loading
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, CircularProgress, Stack } from '@mui/joy';
import { BlogCard } from './BlogCard';
import type { ParsedPost } from '../../lib/blog/parser';

export interface BlogListProps {
  initialPosts: ParsedPost[];
  allPosts?: ParsedPost[];
  onPostClick: (post: ParsedPost) => void;
  pageSize?: number;
}

export function BlogList({
  initialPosts,
  allPosts,
  onPostClick,
  pageSize = 10
}: BlogListProps) {
  const [posts, setPosts] = useState<ParsedPost[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const previousPostsLengthRef = useRef(initialPosts.length);

  useEffect(() => {
    if (allPosts) {
      setHasMore(initialPosts.length < allPosts.length);
    } else {
      setHasMore(initialPosts.length >= pageSize);
    }
  }, [initialPosts.length, allPosts, pageSize]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting && !loading && hasMore) {
          loadMorePosts();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page]);

  const loadMorePosts = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      if (allPosts) {
        const start = page * pageSize;
        const newPosts = allPosts.slice(start, start + pageSize);

        if (newPosts.length === 0) {
          setHasMore(false);
        } else {
          setPosts(prev => {
            const existingFilenames = new Set(prev.map(p => p.filename));
            const uniqueNewPosts = newPosts.filter(
              p => !existingFilenames.has(p.filename)
            );
            return [...prev, ...uniqueNewPosts];
          });
          setPage(prev => prev + 1);

          const nextStart = (page + 1) * pageSize;
          setHasMore(nextStart < allPosts.length);
        }
      } else {
        const response = await fetch(`/api/posts?page=${page}&pageSize=${pageSize}`);

        if (!response.ok) {
          throw new Error(`Failed to load posts: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.posts || !Array.isArray(data.posts)) {
          throw new Error('Invalid response format from API');
        }

        if (data.posts.length === 0) {
          setHasMore(false);
        } else {
          setPosts(prev => {
            const existingFilenames = new Set(prev.map(p => p.filename));
            const uniqueNewPosts = data.posts.filter(
              (p: ParsedPost) => !existingFilenames.has(p.filename)
            );
            return [...prev, ...uniqueNewPosts];
          });
          setPage(prev => prev + 1);
          setHasMore(data.hasMore ?? data.posts.length >= pageSize);
        }
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more posts');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, allPosts, page, pageSize]);

  const handleRetry = useCallback(() => {
    setError(null);
    loadMorePosts();
  }, [loadMorePosts]);

  useEffect(() => {
    if (posts.length > previousPostsLengthRef.current && !loading) {
      previousPostsLengthRef.current = posts.length;
    }
  }, [posts.length, loading]);

  if (posts.length === 0 && !loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 12, px: 2 }} role="status" aria-live="polite">
        <Typography level="h3" sx={{ color: 'text.secondary', mb: 1 }}>No blog posts yet</Typography>
        <Typography level="body-md" sx={{ color: 'text.tertiary' }}>Check back soon for new content!</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '1000px', mx: 'auto' }}>
      <Box
        sx={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {loading && !error && `Loading more posts`}
        {!loading && posts.length > previousPostsLengthRef.current &&
          `Loaded ${posts.length - previousPostsLengthRef.current} new posts`}
        {error && `Error: ${error}`}
      </Box>

      <Stack spacing={2} sx={{ mb: 4 }}>
        {posts.map((post) => (
          <BlogCard
            key={post.filename}
            post={post}
            onClick={() => onPostClick(post)}
            variant="outlined"
          />
        ))}
      </Stack>

      {hasMore && (
        <Box ref={loadMoreRef} sx={{ textAlign: 'center', py: 4, minHeight: 100 }}>
          {loading ? (
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
              <CircularProgress size="sm" variant="soft" aria-label="Loading more posts" />
              <Typography level="body-md" sx={{ color: 'text.secondary' }}>Loading more posts...</Typography>
            </Stack>
          ) : (
            <Typography level="body-sm" sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>Scroll for more</Typography>
          )}
        </Box>
      )}

      {!hasMore && posts.length > 0 && !loading && !error && (
        <Box sx={{ textAlign: 'center', py: 4, borderTop: 1, borderColor: 'divider' }}>
          <Typography level="body-sm" sx={{ color: 'text.tertiary', fontStyle: 'italic' }}>No more posts</Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ textAlign: 'center', py: 4, px: 2 }} role="alert" aria-live="assertive">
          <Typography level="body-md" sx={{ color: 'danger.500', mb: 2 }}>{error}</Typography>
          <Box
            component="button"
            onClick={handleRetry}
            sx={{
              px: 3,
              py: 1,
              bgcolor: 'danger.softBg',
              color: 'danger.500',
              border: '1px solid',
              borderColor: 'danger.300',
              borderRadius: 'sm',
              cursor: 'pointer',
              fontSize: 'sm',
              fontWeight: 'md',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'danger.softHoverBg', borderColor: 'danger.400' },
            }}
          >
            Retry
          </Box>
        </Box>
      )}
    </Box>
  );
}
