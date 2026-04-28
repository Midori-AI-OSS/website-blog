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
  IconButton,
  Chip,
  Card,
  Stack,
  Divider,
  Tooltip,
} from '@mui/joy';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeDialogueQuotes from '@/lib/markdown/rehypeDialogueQuotes';
import { ArrowLeft, Calendar, User, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  extractIsoDateFromBlogFilename,
  formatLongDate,
  normalizeIsoDateString,
} from '@/lib/content/publish';
import { transformPostImageUrl, toLoreImageApiUrl } from '@/lib/content/imageUrl';
import { useDynamicBackdrop } from '@/components/DynamicBackdropProvider';
import { AmbientCoverArt, AMBIENT_PULSE_KEYFRAMES } from '@/components/blog/AmbientCoverArt';
import type { ParsedPost } from '../../lib/blog/parser';
import { TtsPlayer } from './TtsPlayer';

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
  /** Post type for TTS and contextual behavior */
  postType?: 'blog' | 'lore';
  /** Previous lore story link (older timeline entry) */
  previousStory?: {
    href: string;
    title: string;
    summary?: string;
  } | null;
  /** Next lore story link (newer timeline entry) */
  nextStory?: {
    href: string;
    title: string;
    summary?: string;
  } | null;
  /** Lore story navigation callback */
  onNavigateStory?: (href: string) => void;
  /** Whether to render a scheduled teaser instead of the full post */
  isScheduledPreview?: boolean;
  /** The scheduled publish date to show in teaser mode */
  scheduledPublishDate?: string;
}

/**
 * Get the stable YYYY-MM-DD string for display and teaser logic.
 */
function getPostDateString(post: ParsedPost): string | undefined {
  return extractIsoDateFromBlogFilename(post.filename) ?? normalizeIsoDateString(post.metadata.date) ?? undefined;
}

const LORE_IMAGE_TOKEN_TITLE = 'lore-token';

function replaceLoreImageTokens(markdown: string): string {
  return markdown.replace(/\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi, (fullMatch, tokenValue: string) => {
    const url = toLoreImageApiUrl(tokenValue);
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

function lightenHexColor(hex: string, ratio: number): string {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex;
  }

  const clampRatio = Math.max(0, Math.min(1, ratio));
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  const mix = (channel: number) => Math.round(channel + (255 - channel) * clampRatio);
  return `rgb(${mix(red)}, ${mix(green)}, ${mix(blue)})`;
}

function buildTooltipText(
  prefix: string,
  story: { title: string; summary?: string } | null | undefined
): string {
  if (!story) return prefix;
  const summary = (story.summary ?? '').trim();
  if (!summary) return `${prefix}: ${story.title}`;
  const snippet = summary.length > 110 ? `${summary.slice(0, 109).trimEnd()}…` : summary;
  return `${prefix}: ${story.title} - ${snippet}`;
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
              width: '60%',
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
  postType = 'blog',
  previousStory = null,
  nextStory = null,
  onNavigateStory,
  isScheduledPreview = false,
  scheduledPublishDate,
}: PostViewProps) {
  const { setPostCoverUrl } = useDynamicBackdrop();
  const [, setCoverIsLandscape] = useState<boolean | null>(null);
  const [ttsPrimaryColor, setTtsPrimaryColor] = useState<string | null>(null);

  const dateString = useMemo(() => getPostDateString(post), [post.filename, post.metadata.date]);
  const formattedDate = useMemo(
    () => formatLongDate(dateString) ?? 'Unknown date',
    [dateString]
  );
  const scheduledPublishLabel = useMemo(
    () => formatLongDate(scheduledPublishDate ?? dateString) ?? formattedDate,
    [scheduledPublishDate, dateString, formattedDate]
  );
  const markdownContent = useMemo(
    () => replaceLoreImageTokens(post.content),
    [post.content]
  );
  const transformedCoverImageUrl = useMemo(
    () => (post.metadata.cover_image ? transformPostImageUrl(post.metadata.cover_image) : null),
    [post.metadata.cover_image]
  );
  const dialogueColor = useMemo(
    () => (ttsPrimaryColor ? lightenHexColor(ttsPrimaryColor, 0.18) : 'var(--joy-palette-primary-400)'),
    [ttsPrimaryColor]
  );
  const hasLoreStoryNavigation = postType === 'lore' && (previousStory || nextStory);

  useEffect(() => {
    setPostCoverUrl(transformedCoverImageUrl);
    return () => {
      setPostCoverUrl(null);
    };
  }, [setPostCoverUrl, transformedCoverImageUrl]);

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
        maxWidth: { xs: '100%', sm: '100%', md: '90%', lg: '80%' },
        mx: 'auto',
        px: { xs: 0, sm: 4 },
        py: { xs: 2.5, sm: 6 },
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        },
        ...AMBIENT_PULSE_KEYFRAMES,
      }}
    >
      {/* Back Button */}
      <Button
        variant="plain"
        color="neutral"
        onClick={onClose}
        startDecorator={<ArrowLeft size={18} />}
        sx={{
          mb: { xs: 2, sm: 4 },
          alignSelf: 'flex-start',
          minHeight: 44,
          width: { xs: '100%', sm: 'auto' },
          justifyContent: 'flex-start',
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
          p: { xs: 1.5, md: 6 },
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
              mb: { xs: 3, sm: 4 },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Calendar size={16} color="var(--joy-palette-primary-400)" />
              <Typography component="time" dateTime={dateString}>
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
          {transformedCoverImageUrl && (
            <Box sx={{ mb: 4 }}>
              <AmbientCoverArt
                coverImageUrl={transformedCoverImageUrl}
                alt={post.metadata.title}
                isScheduledPreview={isScheduledPreview}
                onAspectRatioChange={(val) => setCoverIsLandscape(val)}
              >
                {hasLoreStoryNavigation && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: { xs: 1, sm: 1.5 },
                      pointerEvents: 'none',
                    }}
                  >
                    <Box sx={{ pointerEvents: 'auto' }}>
                      {previousStory ? (
                        <Tooltip
                          arrow
                          variant="soft"
                          title={buildTooltipText('Past story', previousStory)}
                          enterTouchDelay={0}
                          placement="right"
                        >
                          <IconButton
                            variant="soft"
                            color="neutral"
                            onClick={() => {
                              if (onNavigateStory) {
                                onNavigateStory(previousStory.href);
                              } else {
                                window.location.assign(previousStory.href);
                              }
                            }}
                            aria-label="Go back to past story"
                            sx={{
                              minWidth: 44,
                              minHeight: 44,
                              borderRadius: 0,
                              bgcolor: 'rgba(10, 12, 20, 0.75)',
                              backdropFilter: 'blur(6px)',
                              border: '1px solid',
                              borderColor: 'rgba(255,255,255,0.24)',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                              '&:focus-visible': {
                                outline: '2px solid',
                                outlineColor: 'primary.400',
                                outlineOffset: '2px',
                              },
                            }}
                          >
                            <ChevronLeft size={20} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Box sx={{ width: 44, height: 44 }} />
                      )}
                    </Box>

                    <Box sx={{ pointerEvents: 'auto' }}>
                      {nextStory ? (
                        <Tooltip
                          arrow
                          variant="soft"
                          title={buildTooltipText('Next story', nextStory)}
                          enterTouchDelay={0}
                          placement="left"
                        >
                          <IconButton
                            variant="soft"
                            color="neutral"
                            onClick={() => {
                              if (onNavigateStory) {
                                onNavigateStory(nextStory.href);
                              } else {
                                window.location.assign(nextStory.href);
                              }
                            }}
                            aria-label="Go to next story"
                            sx={{
                              minWidth: 44,
                              minHeight: 44,
                              borderRadius: 0,
                              bgcolor: 'rgba(10, 12, 20, 0.75)',
                              backdropFilter: 'blur(6px)',
                              border: '1px solid',
                              borderColor: 'rgba(255,255,255,0.24)',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                              '&:focus-visible': {
                                outline: '2px solid',
                                outlineColor: 'primary.400',
                                outlineOffset: '2px',
                              },
                            }}
                          >
                            <ChevronRight size={20} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Box sx={{ width: 44, height: 44 }} />
                      )}
                    </Box>
                  </Box>
                )}
              </AmbientCoverArt>
            </Box>
          )}

          {!isScheduledPreview && (
            <Box sx={{ mb: 4 }}>
              <TtsPlayer
                slug={post.filename.replace(/\.md$/, '')}
                type={postType}
                text={post.content}
                onPrimaryColorChange={setTtsPrimaryColor}
                coverImageUrl={transformedCoverImageUrl ?? undefined}
              />
            </Box>
          )}

          {/* Summary */}
          {post.metadata.summary && (
            <Typography
              level="body-lg"
              sx={{
                fontStyle: 'italic',
                color: 'text.secondary',
                fontSize: { xs: '1.05rem', sm: '1.25rem' },
                lineHeight: 1.6,
                borderLeft: '4px solid',
                borderColor: 'primary.500',
                pl: { xs: 2, sm: 3 },
                py: 1,
              }}
            >
              {post.metadata.summary}
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 6, bgcolor: 'rgba(255,255,255,0.1)' }} />

        {isScheduledPreview ? (
          <Card
            variant="soft"
            color="neutral"
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 0,
              border: '1px solid',
              borderColor: 'rgba(255,255,255,0.08)',
              bgcolor: 'rgba(255,255,255,0.03)',
            }}
          >
            <Typography level="title-lg" sx={{ mb: 1 }}>
              Scheduled for {scheduledPublishLabel}
            </Typography>
            <Typography level="body-md" sx={{ color: 'text.secondary', fontSize: { xs: '1rem', sm: '1.05rem' } }}>
              This post is already queued in the site, but it stays hidden until that date begins in Portland time.
            </Typography>
            <Typography level="body-sm" sx={{ mt: 1.5, color: 'text.tertiary', fontSize: '0.98rem' }}>
              The full post content and listen-along player will unlock automatically when the publish date arrives.
            </Typography>
          </Card>
        ) : (
          <Box
            sx={{
              // Typography settings for readability
              fontSize: { xs: '1rem', sm: '1.125rem' }, // 16px on phones, 18px up
              lineHeight: 1.8,
              color: 'text.secondary', // Slightly softer than pure white

              // Prose styling for markdown elements
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                color: 'primary.200', // Light purple for headers
                scrollMarginTop: '100px',
              },
              '& h1': {
                fontSize: { xs: '2rem', sm: '2.5rem' },
                fontWeight: 700,
                mt: 6,
                mb: 3,
              },
              '& h2': {
                fontSize: { xs: '1.6rem', sm: '2rem' },
                fontWeight: 700,
                mt: 5,
                mb: 2.5,
                pb: 1,
                borderBottom: '1px solid',
                borderColor: 'rgba(139, 92, 246, 0.2)', // Subtle purple line
              },
              '& h3': {
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 600,
                mt: 4,
                mb: 2,
                color: 'primary.300',
              },
              '& h4': {
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
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
                ml: { xs: 2, sm: 3 },
                mb: 3,
                pl: { xs: 0.5, sm: 1 },
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
                '&:nth-of-type(2n)': { animationDuration: '4s' },
                '&:nth-of-type(3n)': { animationDuration: '8s' },
                '&:nth-of-type(5n)': { animationDuration: '5s' },
                '&:nth-of-type(7n)': { animationDuration: '7s' },
              },
              '& pre': {
                backgroundColor: '#282c34 !important',
                p: 2,
                borderRadius: 0,
                overflow: 'auto',
                my: 4,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.1)',
                '& code': {
                  backgroundColor: 'transparent !important',
                  color: 'inherit',
                  p: 0,
                  border: 'none',
                  fontFamily: 'inherit',
                  background: 'none',
                  animation: 'none',
                },
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
              '& [data-dialogue="true"]': {
                color: dialogueColor,
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 0,
                my: 4,
                display: 'block',
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.1)',
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
              rehypePlugins={[rehypeSanitize, rehypeHighlight, rehypeDialogueQuotes]}
              components={markdownComponents}
            >
              {markdownContent}
            </ReactMarkdown>
          </Box>
        )}
      </Box>

      {postType === 'lore' && nextStory && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-start' } }}>
          <Tooltip
            arrow
            variant="soft"
            title={buildTooltipText('Next story', nextStory)}
            enterTouchDelay={0}
          >
            <Button
              variant="solid"
              color="primary"
              onClick={() => {
                if (onNavigateStory) {
                  onNavigateStory(nextStory.href);
                } else {
                  window.location.assign(nextStory.href);
                }
              }}
              sx={{
                minHeight: 44,
                width: { xs: '100%', sm: 'auto' },
                borderRadius: 0,
                textTransform: 'none',
                fontWeight: 700,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: 'primary.500',
                  outlineOffset: '2px',
                },
              }}
            >
              Go to next story
            </Button>
          </Tooltip>
        </Box>
      )}

      {/* Footer - Back to top */}
      <Box
        sx={{
          mt: 8,
          textAlign: 'center',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'center',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
        }}
      >
        <Button
          variant="soft"
          color="primary"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}
        >
          Back to top
        </Button>
        <Button
          variant="outlined"
          color="neutral"
          onClick={onClose}
          aria-label={backButtonAriaLabel}
          sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}
        >
          {backButtonLabel}
        </Button>
      </Box>
    </Box>
  );
}
