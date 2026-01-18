'use client';

/**
 * PostView Component
 * 
 * Full post view component for displaying complete blog post content.
 * Features:
 * - Displays post title, date, author, tags, and cover image
 * - Renders markdown content with sanitization (via react-markdown + rehype-sanitize)
 * - Back button for navigation
 * - Keyboard navigation (Escape key to close)
 * - Fully accessible with semantic HTML and ARIA labels
 * - Responsive design with readable typography
 * - Follows MUI Joy patterns from Big-AGI
 */

import React, { useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  AspectRatio,
  Card,
  CardOverflow,
} from '@mui/joy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { ParsedPost } from '../../lib/blog/parser';

/**
 * Props for PostView component
 */
export interface PostViewProps {
  /** The parsed post data to display */
  post: ParsedPost;
  /** Callback function when user wants to close/go back */
  onClose: () => void;
}

/**
 * Extract and format date from filename (YYYY-MM-DD.md format)
 * Falls back to metadata.date if filename doesn't match pattern
 */
function extractDate(post: ParsedPost): Date {
  // Try to extract from filename first
  const match = post.filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) {
    return new Date(match[1]);
  }
  
  // Fall back to metadata.date if it exists
  if (post.metadata.date !== undefined) {
    return new Date(post.metadata.date);
  }
  
  // Last resort: current date
  return new Date();
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * PostView Component
 * 
 * Displays a full blog post with all content and metadata.
 * Content is rendered via react-markdown with sanitization for XSS protection.
 */
export function PostView({ post, onClose }: PostViewProps) {
  // Memoize date extraction to prevent recalculation on every render
  const date = useMemo(() => extractDate(post), [post.filename, post.metadata.date]);
  const formattedDate = useMemo(() => formatDate(date), [date]);

  /**
   * Handle Escape key to close the view
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  /**
   * Scroll to top when post changes
   */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [post.filename]);

  return (
    <Box
      component="article"
      sx={{
        width: '100%',
        maxWidth: '900px',
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, sm: 4, md: 6 },
      }}
    >
      {/* Back Button */}
      <Button
        variant="plain"
        color="neutral"
        onClick={onClose}
        startDecorator={<span aria-hidden="true">←</span>}
        sx={{
          mb: 3,
          px: 1,
          '&:hover': {
            textDecoration: 'underline',
          },
        }}
        aria-label="Back to blog list"
      >
        Back to posts
      </Button>

      {/* Cover Image */}
      {post.metadata.cover_image && (
        <Card
          variant="plain"
          sx={{
            mb: 4,
            overflow: 'hidden',
          }}
        >
          <CardOverflow>
            <AspectRatio ratio="16/9" sx={{ minHeight: 200 }}>
              <img
                src={post.metadata.cover_image}
                alt={post.metadata.title}
                loading="eager"
                style={{ objectFit: 'cover' }}
              />
            </AspectRatio>
          </CardOverflow>
        </Card>
      )}

      {/* Post Header */}
      <Box
        component="header"
        sx={{
          mb: 4,
          pb: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {/* Title */}
        <Typography
          level="h1"
          sx={{
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            fontWeight: 700,
            mb: 2,
            lineHeight: 1.2,
          }}
        >
          {post.metadata.title}
        </Typography>

        {/* Metadata Row */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
            mb: 2,
          }}
        >
          {/* Date */}
          <Typography
            component="time"
            dateTime={date.toISOString()}
            level="body-md"
            sx={{
              color: 'text.secondary',
            }}
          >
            {formattedDate}
          </Typography>

          {/* Author */}
          {post.metadata.author && (
            <>
              <Typography
                level="body-md"
                sx={{ color: 'text.tertiary' }}
              >
                •
              </Typography>
              <Typography
                level="body-md"
                sx={{ color: 'text.secondary' }}
              >
                By {post.metadata.author}
              </Typography>
            </>
          )}
        </Box>

        {/* Tags */}
        {post.metadata.tags && post.metadata.tags.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {post.metadata.tags.map((tag) => (
              <Chip
                key={tag}
                size="sm"
                variant="soft"
                color="neutral"
                sx={{
                  fontSize: '0.875rem',
                }}
              >
                #{tag}
              </Chip>
            ))}
          </Box>
        )}

        {/* Summary */}
        {post.metadata.summary && (
          <Typography
            level="body-lg"
            sx={{
              mt: 3,
              fontStyle: 'italic',
              color: 'text.secondary',
              fontSize: '1.125rem',
              lineHeight: 1.6,
            }}
          >
            {post.metadata.summary}
          </Typography>
        )}
      </Box>

      {/* Markdown Content */}
      <Box
        sx={{
          // Typography settings for readability
          fontSize: '1.125rem',
          lineHeight: 1.75,
          color: 'text.primary',
          
          // Prose styling for markdown elements
          '& h1': {
            fontSize: '2.25rem',
            fontWeight: 700,
            mt: 4,
            mb: 2,
            lineHeight: 1.2,
          },
          '& h2': {
            fontSize: '1.875rem',
            fontWeight: 600,
            mt: 3.5,
            mb: 1.5,
            lineHeight: 1.3,
          },
          '& h3': {
            fontSize: '1.5rem',
            fontWeight: 600,
            mt: 3,
            mb: 1,
            lineHeight: 1.4,
          },
          '& h4': {
            fontSize: '1.25rem',
            fontWeight: 600,
            mt: 2.5,
            mb: 0.75,
            lineHeight: 1.4,
          },
          '& h5': {
            fontSize: '1.125rem',
            fontWeight: 600,
            mt: 2,
            mb: 0.5,
            lineHeight: 1.5,
          },
          '& h6': {
            fontSize: '1rem',
            fontWeight: 600,
            mt: 2,
            mb: 0.5,
            lineHeight: 1.5,
          },
          '& p': {
            mb: 2,
            lineHeight: 1.75,
          },
          '& ul, & ol': {
            ml: 3,
            mb: 2,
            pl: 1,
          },
          '& li': {
            mb: 0.75,
            lineHeight: 1.75,
          },
          '& li > p': {
            mb: 0.5,
          },
          '& blockquote': {
            borderLeft: '4px solid',
            borderColor: 'neutral.300',
            pl: 2,
            py: 0.5,
            ml: 0,
            fontStyle: 'italic',
            color: 'text.secondary',
            mb: 2,
            backgroundColor: 'background.level1',
          },
          '& code': {
            backgroundColor: 'background.level2',
            px: 0.75,
            py: 0.25,
            borderRadius: 'sm',
            fontSize: '0.9em',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          },
          '& pre': {
            backgroundColor: 'background.level2',
            p: 2,
            borderRadius: 'md',
            overflow: 'auto',
            mb: 2,
            border: 1,
            borderColor: 'divider',
            '& code': {
              backgroundColor: 'transparent',
              px: 0,
              py: 0,
              fontSize: '0.875rem',
              lineHeight: 1.6,
            },
          },
          '& a': {
            color: 'primary.500',
            textDecoration: 'underline',
            '&:hover': {
              color: 'primary.600',
              textDecoration: 'underline',
            },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.500',
              outlineOffset: 2,
              borderRadius: 'sm',
            },
          },
          '& img': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 'md',
            my: 2,
            display: 'block',
          },
          '& hr': {
            border: 'none',
            borderTop: 1,
            borderColor: 'divider',
            my: 4,
          },
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            mb: 2,
            overflow: 'auto',
            display: 'block',
          },
          '& th': {
            backgroundColor: 'background.level2',
            fontWeight: 600,
            textAlign: 'left',
            p: 1.5,
            borderBottom: 2,
            borderColor: 'divider',
          },
          '& td': {
            p: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
          },
          '& tr:last-child td': {
            borderBottom: 'none',
          },
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
        >
          {post.content}
        </ReactMarkdown>
      </Box>

      {/* Footer - Back to top */}
      <Box
        sx={{
          mt: 6,
          pt: 4,
          borderTop: 1,
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Button
          variant="soft"
          color="neutral"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{ mr: 2 }}
        >
          Back to top
        </Button>
        <Button
          variant="outlined"
          color="neutral"
          onClick={onClose}
        >
          Back to posts
        </Button>
      </Box>
    </Box>
  );
}
