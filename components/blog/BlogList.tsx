'use client';

/**
 * BlogList Component
 * 
 * A component that displays blog cards in a responsive grid with lazy loading.
 * Features:
 * - Responsive grid layout (1/2/3 columns based on screen size)
 * - Lazy loading with Intersection Observer for infinite scroll
 * - Initial batch of 10 posts with progressive loading
 * - Loading states (initial, loading more, error)
 * - Empty state handling
 * - Full accessibility with ARIA live regions and focus management
 * - Works with both SSG (static) and CSR (client-side) data loading
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box, Typography, CircularProgress, Stack } from '@mui/joy';
import { BlogCard } from './BlogCard';
import type { ParsedPost } from '../../lib/blog/parser';

/**
 * Props for BlogList component
 */
export interface BlogListProps {
  /** Initial posts to display (for SSG/SSR) */
  initialPosts: ParsedPost[];
  /** All posts for client-side pagination (optional) */
  allPosts?: ParsedPost[];
  /** Callback when a post is clicked */
  onPostClick: (post: ParsedPost) => void;
  /** Number of posts to load per page (default: 10) */
  pageSize?: number;
}

/**
 * BlogList Component
 * 
 * Displays a grid of blog cards with infinite scroll loading.
 * Uses Intersection Observer for performant scroll detection.
 */
export function BlogList({ 
  initialPosts, 
  allPosts, 
  onPostClick,
  pageSize = 10 
}: BlogListProps) {
  const [posts, setPosts] = useState<ParsedPost[]>(initialPosts);
  const [page, setPage] = useState(1); // Already loaded page 0 (initial)
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const previousPostsLengthRef = useRef(initialPosts.length);

  // Check if there are more posts available
  useEffect(() => {
    if (allPosts) {
      // For static/SSG mode
      setHasMore(initialPosts.length < allPosts.length);
    } else {
      // For CSR mode, assume more until proven otherwise
      setHasMore(initialPosts.length >= pageSize);
    }
  }, [initialPosts.length, allPosts, pageSize]);

  /**
   * Infinite scroll with Intersection Observer
   * Triggers when the load more element comes into view
   */
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Trigger load when the sentinel element is visible
        if (entries[0] && entries[0].isIntersecting && !loading && hasMore) {
          loadMorePosts();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px' // Start loading 100px before reaching the element
      }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, page]); // Re-create observer when these change

  /**
   * Load more posts (either from static data or API)
   * Memoized to prevent unnecessary re-creation on every render
   */
  const loadMorePosts = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Mode 1: Static/SSG - slice from allPosts array
      if (allPosts) {
        const start = page * pageSize;
        const newPosts = allPosts.slice(start, start + pageSize);
        
        if (newPosts.length === 0) {
          setHasMore(false);
        } else {
          setPosts(prev => {
            // Prevent duplicates by checking filenames
            const existingFilenames = new Set(prev.map(p => p.filename));
            const uniqueNewPosts = newPosts.filter(
              p => !existingFilenames.has(p.filename)
            );
            return [...prev, ...uniqueNewPosts];
          });
          setPage(prev => prev + 1);
          
          // Check if there are more posts after this batch
          const nextStart = (page + 1) * pageSize;
          setHasMore(nextStart < allPosts.length);
        }
      }
      // Mode 2: CSR - fetch from API endpoint
      else {
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
            // Prevent duplicates
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
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to load more posts. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, allPosts, page, pageSize]); // Memoize with dependencies

  /**
   * Retry loading after an error
   * Memoized to prevent re-creation on every render
   */
  const handleRetry = useCallback(() => {
    setError(null);
    loadMorePosts();
  }, [loadMorePosts]); // Depends on loadMorePosts

  /**
   * Announce new posts to screen readers when they load
   */
  useEffect(() => {
    // Only announce if posts were added (not on initial load)
    if (posts.length > previousPostsLengthRef.current && !loading) {
      const newPostsCount = posts.length - previousPostsLengthRef.current;
      // The live region will announce this
      previousPostsLengthRef.current = posts.length;
    }
  }, [posts.length, loading]);

  // Empty state - no posts at all
  if (posts.length === 0 && !loading) {
    return (
      <Box 
        sx={{ 
          textAlign: 'center', 
          py: 12,
          px: 2,
        }}
        role="status"
        aria-live="polite"
      >
        <Typography 
          level="h3" 
          sx={{ 
            color: 'text.secondary',
            mb: 1,
          }}
        >
          No blog posts yet
        </Typography>
        <Typography 
          level="body-md" 
          sx={{ 
            color: 'text.tertiary',
          }}
        >
          Check back soon for new content!
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Accessibility: Live region for loading announcements */}
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
      
      {/* Responsive grid layout: 1 column on mobile, 2 on tablet, 3 on desktop */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 3,
          mb: 4,
        }}
      >
        {posts.map((post) => (
          <BlogCard
            key={post.filename}
            post={post}
            onClick={() => onPostClick(post)}
            variant="outlined"
          />
        ))}
      </Box>
      
      {/* Loading trigger element for Intersection Observer */}
      {hasMore && (
        <Box 
          ref={loadMoreRef} 
          sx={{ 
            textAlign: 'center', 
            py: 4,
            minHeight: 100,
          }}
        >
          {loading ? (
            <Stack 
              direction="row" 
              spacing={2} 
              alignItems="center" 
              justifyContent="center"
            >
              <CircularProgress 
                size="sm" 
                variant="soft"
                aria-label="Loading more posts"
              />
              <Typography 
                level="body-md" 
                sx={{ color: 'text.secondary' }}
              >
                Loading more posts...
              </Typography>
            </Stack>
          ) : (
            <Typography 
              level="body-sm" 
              sx={{ 
                color: 'text.tertiary',
                fontStyle: 'italic',
              }}
            >
              Scroll for more
            </Typography>
          )}
        </Box>
      )}
      
      {/* No more posts indicator */}
      {!hasMore && posts.length > 0 && !loading && !error && (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 4,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography 
            level="body-sm" 
            sx={{ 
              color: 'text.tertiary',
              fontStyle: 'italic',
            }}
          >
            No more posts
          </Typography>
        </Box>
      )}
      
      {/* Error state with retry option */}
      {error && (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 4,
            px: 2,
          }}
          role="alert"
          aria-live="assertive"
        >
          <Typography 
            level="body-md" 
            sx={{ 
              color: 'danger.500',
              mb: 2,
            }}
          >
            {error}
          </Typography>
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
              '&:hover': {
                bgcolor: 'danger.softHoverBg',
                borderColor: 'danger.400',
              },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'danger.500',
                outlineOffset: 2,
              },
            }}
          >
            Retry
          </Box>
        </Box>
      )}
    </Box>
  );
}
