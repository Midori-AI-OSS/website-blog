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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  AspectRatio,
  Card,
  CardOverflow,
  Stack,
  Divider,
} from '@mui/joy';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import type { ParsedPost } from '../../lib/blog/parser';

/**
 * Props for PostView component
 */
export interface PostViewProps {
  /** The parsed post data to display */
  post: ParsedPost;
  /** Callback function when user wants to close/go back */
  onClose: () => void;
  /** Back button label (defaults to blog wording) */
  backButtonLabel?: string;
  /** Back button aria-label (defaults to blog wording) */
  backButtonAriaLabel?: string;
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
 * Transform static blog image URLs to API route URLs
 * Converts /blog/image.png to /api/blog-images/image.png for dynamic serving
 */
function transformImageUrl(url: string): string {
  // If URL starts with /blog/, transform it to use API route
  if (url.startsWith('/blog/')) {
    return url.replace('/blog/', '/api/blog-images/');
  }
  // Otherwise return as-is (for external URLs or other paths)
  return url;
}

const LORE_IMAGE_TOKEN_TITLE = 'lore-token';

function getSlugFromFilename(filename: string): string {
  return filename.replace(/\.mdx?$/i, '');
}

function toLoreImageApiUrl(tokenValue: string, postFilename: string): string | null {
  const raw = tokenValue.trim();
  if (!raw.toLowerCase().startsWith('lore/')) return null;

  const afterPrefix = raw.slice('lore/'.length).replace(/^\/+/, '').trim();
  if (!afterPrefix) return null;

  const segments = afterPrefix.split('/').filter(Boolean);
  const slug = getSlugFromFilename(postFilename);

  const finalSegments = segments.length === 1 ? [slug, segments[0]!] : segments;
  const encoded = finalSegments.map((s) => encodeURIComponent(s)).join('/');
  return `/api/lore-images/${encoded}`;
}

function replaceLoreImageTokens(markdown: string, postFilename: string): string {
  return markdown.replace(/\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi, (fullMatch, tokenValue: string) => {
    const url = toLoreImageApiUrl(tokenValue, postFilename);
    if (!url) return fullMatch;

    const raw = tokenValue.trim();
    const basename = raw.split('/').filter(Boolean).pop() ?? 'image';
    const alt = basename
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Lore image';

    return `\n\n![${alt}](${url} \"${LORE_IMAGE_TOKEN_TITLE}\")\n\n`;
  });
}

const markdownComponents: Components = {
  img: (props) => {
    const { node: _node, ...imgProps } = props;
    const { src, alt, title } = imgProps;

    if (title === LORE_IMAGE_TOKEN_TITLE && typeof src === 'string' && src.length > 0) {
      return (
        <Card
          variant="plain"
          sx={{
            p: 0,
            my: 4,
            overflow: 'hidden',
            borderRadius: 0,
            border: 'none',
            bgcolor: 'black',
            position: 'relative',
            minHeight: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: { xs: 3, sm: 4 },
            '--Card-padding': '0px',
            '&:hover, &:focus-within': {
              bgcolor: 'black',
              borderColor: 'transparent',
              boxShadow: 'none',
              outline: 'none',
            },
          }}
        >
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
            src={src}
            alt=""
            loading="lazy"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(20px) brightness(0.55)',
              transform: 'scale(1.1)',
              zIndex: 0,
              opacity: 0.85,
              my: 0,
              border: 'none',
              background: 'none',
              animation: 'none',
            }}
          />

          <Box
            component="img"
            src={src}
            alt={typeof alt === 'string' ? alt : ''}
            loading="lazy"
            sx={{
              position: 'relative',
              zIndex: 1,
              objectFit: 'contain',
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              my: 0,
              border: 'none',
              background: 'none',
              animation: 'none',
            }}
          />
        </Card>
      );
    }

    return <img {...imgProps} />;
  },
};

/**
 * PostView Component
 * 
 * Displays a full blog post with all content and metadata.
 * Content is rendered via react-markdown with sanitization for XSS protection.
 */
export function PostView({
  post,
  onClose,
  backButtonLabel = 'Back to posts',
  backButtonAriaLabel = 'Back to blog list',
}: PostViewProps) {
  const [coverIsLandscape, setCoverIsLandscape] = useState<boolean | null>(null);

  // Memoize date extraction to prevent recalculation on every render
  const date = useMemo(() => extractDate(post), [post.filename, post.metadata.date]);
  const formattedDate = useMemo(() => formatDate(date), [date]);
  const markdownContent = useMemo(
    () => replaceLoreImageTokens(post.content, post.filename),
    [post.content, post.filename]
  );

  useEffect(() => {
    setCoverIsLandscape(null);
  }, [post.metadata.cover_image]);

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
        maxWidth: '80%', // Slightly wider for better reading experience
        mx: 'auto',
        px: { xs: 2, sm: 4 },
        py: { xs: 3, sm: 6 },
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        },
        '@keyframes ambient-pulse': {
          '0%': { transform: 'scale(1.1)', opacity: 0.8 },
          '50%': { transform: 'scale(1.14)', opacity: 0.6 },
          '100%': { transform: 'scale(1.1)', opacity: 0.8 },
        }
      }}
    >
      {/* Back Button */}
      <Button
        variant="plain"
        color="neutral"
        onClick={onClose}
        startDecorator={<ArrowLeft size={18} />}
        sx={{
          mb: 4,
          alignSelf: 'flex-start',
          '&:hover': {
            backgroundColor: 'background.level1',
          },
        }}
        aria-label={backButtonAriaLabel}
      >
        {backButtonLabel}
      </Button>

      {/* Main Content Container with Glass Effect */}
      <Box
        sx={{
          bgcolor: 'rgba(19, 10, 30, 0.4)', // Purple tint glass
          backdropFilter: 'blur(12px)',
          border: '1px solid',
          borderColor: 'rgba(255,255,255,0.08)',
          p: { xs: 3, md: 6 },
          // Removed borderRadius to keep sharp edges
        }}
      >
        {/* Post Header */}
        <Box component="header" sx={{ mb: 6 }}>
          {/* Tags */}
          {post.metadata.tags && post.metadata.tags.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
              {post.metadata.tags.map((tag) => (
                <Chip
                  key={tag}
                  size="sm"
                  variant="outlined"
                  color="primary"
                  startDecorator={<Tag size={12} />}
                  sx={{
                    borderRadius: 0, // Sharp tags
                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                  }}
                >
                  {tag}
                </Chip>
              ))}
            </Stack>
          )}

          {/* Title */}
          <Typography
            level="h1"
            sx={{
              fontSize: { xs: '2rem', sm: '3rem', md: '3.5rem' },
              fontWeight: 800,
              mb: 3,
              lineHeight: 1.1,
              background: 'linear-gradient(to right, #fff, #a78bfa)', // White to Purple gradient text
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {post.metadata.title}
          </Typography>

          {/* Metadata Row */}
          <Stack
            direction="row"
            spacing={3}
            alignItems="center"
            sx={{
              color: 'text.secondary',
              fontSize: '0.95rem',
              mb: 4
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Calendar size={16} color="var(--joy-palette-primary-400)" />
              <Typography component="time" dateTime={date.toISOString()}>
                {formattedDate}
              </Typography>
            </Stack>

            {post.metadata.author && (
              <Stack direction="row" spacing={1} alignItems="center">
                <User size={16} color="var(--joy-palette-primary-400)" />
                <Typography>
                  {post.metadata.author}
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Cover Image - Ambient Mode */}
          {post.metadata.cover_image && (
            <Card
              variant="plain"
              sx={{
                p: 0,
                mb: 4,
                overflow: 'hidden',
                borderRadius: 0,
                border: 'none', // Remove outline
                bgcolor: 'black',
                position: 'relative',
                minHeight: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Explicitly remove any hover effects
                '--Card-padding': '0px',
                '&:hover, &:focus-within': {
                  bgcolor: 'black',
                  borderColor: 'transparent',
                  boxShadow: 'none',
                  outline: 'none',
                },
              }}
            >
              {/* Vignette / Feather Overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 10,
                  boxShadow: 'inset 0 0 60px 30px #000', // Heavy feathering
                  pointerEvents: 'none',
                }}
              />
              {/* Background Layer */}
              <Box
                component="img"
                src={transformImageUrl(post.metadata.cover_image)}
                alt=""
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'blur(20px) brightness(0.6)',
                  transform: 'scale(1.1)',
                  zIndex: 0,
                  opacity: 0.8,
                  animation: 'ambient-pulse 10s ease-in-out infinite',
                }}
              />

              {/* Foreground Image */}
              <Box
                component="img"
                src={transformImageUrl(post.metadata.cover_image)}
                alt={post.metadata.title}
                loading="lazy"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    setCoverIsLandscape(img.naturalWidth > img.naturalHeight);
                  }
                }}
	                sx={{
	                  position: 'relative',
	                  zIndex: 1,
	                  objectFit: 'contain',
	                  maxWidth:
	                    coverIsLandscape === true
	                      ? '60%'
	                      : '35%',
	                  height: 'auto',
	                  maxHeight: '15%',
	                  width: 'auto',
	                  display: 'block',
	                  // Remove previous shadow as the vignette handles the transition
	                }}
              />
            </Card>
          )}

          {/* Summary */}
          {post.metadata.summary && (
            <Typography
              level="body-lg"
              sx={{
                fontStyle: 'italic',
                color: 'text.secondary',
                fontSize: '1.25rem',
                lineHeight: 1.6,
                borderLeft: '4px solid',
                borderColor: 'primary.500',
                pl: 3,
                py: 1,
              }}
            >
              {post.metadata.summary}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 6, bgcolor: 'rgba(255,255,255,0.1)' }} />

        {/* Markdown Content */}
        <Box
          sx={{
            // Typography settings for readability
            fontSize: '1.125rem', // 18px
            lineHeight: 1.8,
            color: 'text.secondary', // Slightly softer than pure white

            // Prose styling for markdown elements
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              color: 'primary.200', // Light purple for headers
              scrollMarginTop: '100px',
            },
            '& h1': {
              fontSize: '2.5rem',
              fontWeight: 700,
              mt: 6,
              mb: 3,
            },
            '& h2': {
              fontSize: '2rem',
              fontWeight: 700,
              mt: 5,
              mb: 2.5,
              pb: 1,
              borderBottom: '1px solid',
              borderColor: 'rgba(139, 92, 246, 0.2)', // Subtle purple line
            },
            '& h3': {
              fontSize: '1.5rem',
              fontWeight: 600,
              mt: 4,
              mb: 2,
              color: 'primary.300',
            },
            '& h4': {
              fontSize: '1.25rem',
              fontWeight: 600,
              mt: 3,
              mb: 1.5,
            },
            '& p': {
              mb: 3,
            },
            '& strong': {
              color: 'text.primary',
              fontWeight: 600,
            },
            '& ul, & ol': {
              ml: 3,
              mb: 3,
              pl: 1,
              '& li': {
                mb: 1,
                pl: 1,
                '&::marker': {
                  color: 'primary.400', // Purple bullets
                }
              }
            },
            '& blockquote': {
              borderLeft: '4px solid',
              borderColor: 'primary.500',
              pl: 3,
              py: 2,
              my: 4,
              fontStyle: 'italic',
              bgcolor: 'rgba(139, 92, 246, 0.05)', // Very subtle purple tint
              color: 'text.primary',
            },
            '& code': {
              // INLINE CODE STYLING (Dark Green Highlight)
              backgroundColor: 'rgba(20, 83, 45, 0.6)',
              color: '#4ade80', // Bright green text
              px: 0.75,
              py: 0.25,
              borderRadius: 0, // Sharp
              fontSize: '0.9rem',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              border: '1px solid',
              borderColor: 'rgba(74, 222, 128, 0.2)',

              // Shimmer Effect
              background: 'linear-gradient(to right, rgba(20, 83, 45, 0.6) 0%, rgba(74, 222, 128, 0.25) 50%, rgba(20, 83, 45, 0.6) 100%)',
              backgroundSize: '1000px 100%',
              animation: 'shimmer 6s linear infinite',
              // Pseudo-random durations for wave effect
              '&:nth-of-type(2n)': { animationDuration: '4s' },
              '&:nth-of-type(3n)': { animationDuration: '8s' },
              '&:nth-of-type(5n)': { animationDuration: '5s' },
              '&:nth-of-type(7n)': { animationDuration: '7s' },
            },
            '& pre': {
              // CODE BLOCK CONTAINER
              backgroundColor: '#282c34 !important', // Match Atom One Dark background
              p: 2,
              borderRadius: 0, // Sharp
              overflow: 'auto',
              my: 4,
              border: '1px solid',
              borderColor: 'rgba(255,255,255,0.1)',
              '& code': {
                // Reset inline styles for code blocks
                backgroundColor: 'transparent !important',
                color: 'inherit',
                p: 0,
                border: 'none',
                fontFamily: 'inherit',
                background: 'none', // No shimmer on block code text
                animation: 'none',
              },
              // Ensure highlight.js classes work
              '& .hljs': {
                background: 'transparent',
              }
            },
            '& a': {
              color: 'primary.400',
              textDecoration: 'none',
              borderBottom: '1px dashed',
              borderColor: 'primary.400',
              transition: 'all 0.2s',
              '&:hover': {
                color: 'primary.300',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderBottomStyle: 'solid',
              },
            },
            '& img': {
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 0, // Sharp
              my: 4,
              display: 'block',
              border: '1px solid',
              borderColor: 'rgba(255,255,255,0.1)',

              // Shimmer on content images too
              background: 'linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0) 100%)',
              backgroundSize: '1000px 100%',
              animation: 'shimmer 15s linear infinite',
            },
            '& hr': {
              border: 'none',
              borderTop: '1px solid',
              borderColor: 'divider',
              my: 6,
            },
            '& table': {
              width: '100%',
              borderCollapse: 'collapse',
              my: 4,
              display: 'block',
              overflowX: 'auto',
            },
            '& th': {
              textAlign: 'left',
              p: 2,
              borderBottom: '2px solid',
              borderColor: 'primary.500',
              color: 'primary.100',
            },
            '& td': {
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize, rehypeHighlight]}
            components={markdownComponents}
          >
            {markdownContent}
          </ReactMarkdown>
        </Box>
      </Box>

      {/* Footer - Back to top */}
      <Box
        sx={{
          mt: 8,
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Button
          variant="soft"
          color="primary"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Back to top
        </Button>
        <Button
          variant="outlined"
          color="neutral"
          onClick={onClose}
          aria-label={backButtonAriaLabel}
        >
          {backButtonLabel}
        </Button>
      </Box>
    </Box>
  );
}
