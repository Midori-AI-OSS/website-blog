/**
 * BlogCard Component
 * 
 * A reusable card component for displaying blog post preview information.
 * Features:
 * - Displays title, date, summary, cover image, and tags
 * - Clickable with keyboard navigation support (Enter key)
 * - Follows Big-AGI card layout patterns with MUI Joy
 * - Fully accessible with ARIA labels and semantic HTML
 * - Displays sanitized content from parser
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardOverflow,
  AspectRatio,
  Typography,
  Chip,
  Box,
} from '@mui/joy';
import type { ParsedPost } from '../../lib/blog/parser';

/**
 * Props for BlogCard component
 */
export interface BlogCardProps {
  /** The parsed post data to display */
  post: ParsedPost;
  /** Callback function when card is clicked */
  onClick: () => void;
  /** Optional color variant for the card (default: 'neutral') */
  color?: 'primary' | 'neutral' | 'danger' | 'success' | 'warning';
  /** Optional card variant (default: 'plain') */
  variant?: 'plain' | 'outlined' | 'soft' | 'solid';
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
 * BlogCard Component
 * 
 * Displays a blog post preview in a card format with optional cover image,
 * title, date, summary, and tags. Follows Big-AGI card patterns and ensures
 * full accessibility.
 */
export function BlogCard({ 
  post, 
  onClick, 
  color = 'neutral',
  variant = 'plain' 
}: BlogCardProps) {
  const date = extractDate(post);
  const formattedDate = formatDate(date);
  
  /**
   * Handle keyboard interaction (Enter key triggers click)
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      color={color}
      variant={variant}
      sx={{
        mb: 3,
        minHeight: 32,
        gap: 1,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 'md',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.500',
          outlineOffset: 2,
        },
      }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`Read blog post: ${post.metadata.title}`}
    >
      {/* Cover Image (optional, shown at top with aspect ratio 2:1) */}
      {post.metadata.cover_image && (
        <CardOverflow>
          <AspectRatio ratio="2">
            <img
              src={post.metadata.cover_image}
              alt={post.metadata.title}
              loading="lazy"
              style={{ objectFit: 'cover' }}
            />
          </AspectRatio>
        </CardOverflow>
      )}

      {/* Card Content */}
      <CardContent sx={{ position: 'relative', gap: 1 }}>
        {/* Title */}
        <Typography 
          level="title-lg" 
          component="h3"
          sx={{ 
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          {post.metadata.title}
        </Typography>

        {/* Date */}
        <Typography 
          level="body-sm" 
          component="time"
          dateTime={date.toISOString()}
          sx={{ 
            color: 'text.secondary',
            mb: 1,
            display: 'block',
          }}
        >
          {formattedDate}
        </Typography>

        {/* Author (optional) */}
        {post.metadata.author && (
          <Typography 
            level="body-sm"
            sx={{ 
              color: 'text.secondary',
              mb: 1,
              fontStyle: 'italic',
            }}
          >
            By {post.metadata.author}
          </Typography>
        )}

        {/* Summary (optional) */}
        {post.metadata.summary && (
          <Typography 
            level="body-sm"
            sx={{ 
              color: 'text.primary',
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            {post.metadata.summary}
          </Typography>
        )}

        {/* Tags (optional) */}
        {post.metadata.tags && post.metadata.tags.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              mt: 'auto',
            }}
          >
            {post.metadata.tags.map((tag) => (
              <Chip
                key={tag}
                size="sm"
                variant="soft"
                color="neutral"
                sx={{
                  fontSize: '0.75rem',
                }}
              >
                {tag}
              </Chip>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
