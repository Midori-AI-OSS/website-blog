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

import { keyframes } from '@emotion/react';
import { Box, Button, Card, Chip, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/joy';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Tag, User } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { AMBIENT_PULSE_KEYFRAMES, AmbientCoverArt } from '@/components/blog/AmbientCoverArt';
import { useDynamicBackdrop } from '@/components/DynamicBackdropProvider';
import { SpeciesCareCardEmbed } from '@/components/species-care/SpeciesCareCardEmbed';
import {
  POST_COVER_PLACEHOLDER_IMAGE_URL,
  resolvePostCoverImageUrl,
  toLoreImageApiUrl,
} from '@/lib/content/imageUrl';
import {
  extractIsoDateFromBlogFilename,
  formatLongDate,
  normalizeIsoDateString,
} from '@/lib/content/publish';
import rehypeDialogueQuotes from '@/lib/markdown/rehypeDialogueQuotes';
import remarkThinkingTags from '@/lib/markdown/remarkThinkingTags';
import { splitMarkdownSpeciesCareTokens } from '@/lib/species-care/tokens';
import type { SpeciesCareCardEmbedMap } from '@/lib/species-care/types';
import type { ParsedPost } from '../../lib/blog/parser';
import { TtsPlayer } from './TtsPlayer';

const shimmerKeyframes = keyframes({
  '0%': { backgroundPosition: '-1000px 0' },
  '100%': { backgroundPosition: '1000px 0' },
});

const thinkingPulseKeyframes = keyframes({
  '0%, 100%': {
    opacity: 0.92,
    backgroundPosition: '160% 50%',
    textShadow: '0 0 0 transparent',
  },
  '50%': {
    opacity: 1,
    backgroundPosition: '20% 50%',
    textShadow: '0 0 18px var(--PostView-thinking-glow)',
  },
});

const thinkingFloatKeyframes = keyframes({
  '0%, 100%': { transform: 'translateY(0)' },
  '50%': { transform: 'translateY(-3px)' },
});

const glitchFlickerKeyframes = keyframes({
  '0%, 100%': { opacity: 1 },
  '3%': { opacity: 0.7, transform: 'translateX(1px)' },
  '6%': { opacity: 1, transform: 'translateX(-1px)' },
  '9%': { opacity: 0.85, transform: 'translateX(0)' },
  '92%': { opacity: 1 },
  '95%': { opacity: 0.75, transform: 'translateX(-0.5px)' },
  '98%': { opacity: 1, transform: 'translateX(0.5px)' },
});

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
  /** Whether to hide the back button (e.g. nested chapter view) */
  hideBackButton?: boolean;
  /** Disable dynamic backdrop updates (e.g. multiple PostViews stacking) */
  disableDynamicBackdrop?: boolean;
  /** Species care cards loaded for any {{speciescard: lore/<slug>}} tokens in this post */
  speciesCareCards?: SpeciesCareCardEmbedMap;
  /** Optional game cover image URL to use as the backdrop */
  gameCoverImage?: string;
}

/**
 * Get the stable YYYY-MM-DD string for display and teaser logic.
 */
function getPostDateString(post: ParsedPost): string | undefined {
  return (
    extractIsoDateFromBlogFilename(post.filename) ??
    normalizeIsoDateString(post.metadata.date) ??
    undefined
  );
}

const LORE_IMAGE_TOKEN_TITLE = 'lore-token';

const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), ['data-thinking', 'inline', 'block']],
    div: [...(defaultSchema.attributes?.div ?? []), ['data-thinking', 'inline', 'block']],
  },
};

function replaceLoreImageTokens(markdown: string): string {
  return markdown.replace(
    /\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi,
    (fullMatch, tokenValue: string) => {
      const url = toLoreImageApiUrl(tokenValue);
      if (!url) return fullMatch;

      const raw = tokenValue.trim();
      const basename = raw.split('/').filter(Boolean).pop() ?? 'image';
      const alt =
        basename
          .replace(/\.[a-z0-9]+$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim() || 'Lore image';

      return `\n\n![${alt}](${url} "${LORE_IMAGE_TOKEN_TITLE}")\n\n`;
    },
  );
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

function hexToRgba(hex: string | null, alpha: number, fallback: string): string {
  const normalized = hex?.trim().replace(/^#/, '') ?? '';
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }

  const clampAlpha = Math.max(0, Math.min(1, alpha));
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${clampAlpha})`;
}

function buildTooltipText(
  prefix: string,
  story: { title: string; summary?: string } | null | undefined,
): string {
  if (!story) return prefix;
  const summary = (story.summary ?? '').trim();
  if (!summary) return `${prefix}: ${story.title}`;
  const snippet = summary.length > 110 ? `${summary.slice(0, 109).trimEnd()}…` : summary;
  return `${prefix}: ${story.title} - ${snippet}`;
}

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
  hideBackButton = false,
  disableDynamicBackdrop = false,
  speciesCareCards = {},
  gameCoverImage,
}: PostViewProps) {
  const { setPostCoverUrl } = useDynamicBackdrop();
  const [, setCoverIsLandscape] = useState<boolean | null>(null);
  const [ttsPrimaryColor, setTtsPrimaryColor] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const dateString = useMemo(
    () => getPostDateString(post),
    [post.filename, post.metadata.date, post],
  );
  const formattedDate = useMemo(() => formatLongDate(dateString) ?? 'Unknown date', [dateString]);
  const scheduledPublishLabel = useMemo(
    () => formatLongDate(scheduledPublishDate ?? dateString) ?? formattedDate,
    [scheduledPublishDate, dateString, formattedDate],
  );
  const markdownContent = useMemo(() => replaceLoreImageTokens(post.content), [post.content]);
  const markdownParts = useMemo(
    () => splitMarkdownSpeciesCareTokens(markdownContent),
    [markdownContent],
  );
  const renderChunks = useMemo(() => {
    const chunks: Array<
      | { key: string; type: 'card-group'; cardParts: typeof markdownParts }
      | { key: string; type: 'markdown'; markdownPart: (typeof markdownParts)[number] }
    > = [];
    let cardBuffer: typeof markdownParts = [];
    let groupIndex = 0;

    const flushCards = () => {
      if (cardBuffer.length > 0) {
        chunks.push({
          key: `card-group-${groupIndex}`,
          type: 'card-group',
          cardParts: [...cardBuffer],
        });
        cardBuffer = [];
        groupIndex++;
      }
    };

    for (const part of markdownParts) {
      if (part.type === 'species-card') {
        cardBuffer.push(part);
      } else if (part.content && !part.content.trim()) {
        if (part.content.includes('\n')) flushCards();
      } else {
        flushCards();
        chunks.push({ key: part.id, type: 'markdown', markdownPart: part });
      }
    }
    flushCards();
    return chunks;
  }, [markdownParts]);
  const transformedCoverImageUrl = useMemo(
    () => resolvePostCoverImageUrl(post.metadata.cover_image),
    [post.metadata.cover_image],
  );
  const [effectiveCoverImageUrl, setEffectiveCoverImageUrl] = useState(transformedCoverImageUrl);
  const dialogueColor = useMemo(
    () =>
      ttsPrimaryColor ? lightenHexColor(ttsPrimaryColor, 0.18) : 'var(--joy-palette-primary-400)',
    [ttsPrimaryColor],
  );
  const thinkingColor = useMemo(
    () => (ttsPrimaryColor ? lightenHexColor(ttsPrimaryColor, 0.45) : '#bae6fd'),
    [ttsPrimaryColor],
  );
  const thinkingGlowColor = useMemo(
    () => hexToRgba(ttsPrimaryColor, 0.55, 'rgba(125, 211, 252, 0.55)'),
    [ttsPrimaryColor],
  );
  const thinkingMutedColor = useMemo(
    () => hexToRgba(ttsPrimaryColor, 0.62, 'rgba(186, 230, 253, 0.62)'),
    [ttsPrimaryColor],
  );
  const _thinkingBorderColor = useMemo(
    () => hexToRgba(ttsPrimaryColor, 0.68, 'rgba(125, 211, 252, 0.65)'),
    [ttsPrimaryColor],
  );
  const _thinkingSoftBorderColor = useMemo(
    () => hexToRgba(ttsPrimaryColor, 0.24, 'rgba(125, 211, 252, 0.22)'),
    [ttsPrimaryColor],
  );
  const _thinkingStrongBackground = useMemo(
    () => hexToRgba(ttsPrimaryColor, 0.5, 'rgba(14, 116, 144, 0.35)'),
    [ttsPrimaryColor],
  );
  const _thinkingSoftBackground = useMemo(
    () => hexToRgba(ttsPrimaryColor, 0.25, 'rgba(59, 130, 246, 0.2)'),
    [ttsPrimaryColor],
  );
  const hasLoreStoryNavigation = postType === 'lore' && (previousStory || nextStory);

  const markdownComponents = useMemo<Components>(
    () => ({
      img: (props) => {
        const { node: _node, ...imgProps } = props;
        const { src, alt, title } = imgProps;

        if (title === LORE_IMAGE_TOKEN_TITLE && typeof src === 'string' && src.length > 0) {
          const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            const img = e.currentTarget;
            const depth = Number(img.getAttribute('data-fallback-depth') ?? 0);

            if (depth === 0 && gameCoverImage) {
              img.setAttribute('data-fallback-depth', '1');
              img.src = gameCoverImage;
            } else if (depth <= 1) {
              img.setAttribute('data-fallback-depth', '2');
              img.src = POST_COVER_PLACEHOLDER_IMAGE_URL;
            }
          };

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
                onError={handleImageError}
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
                onError={handleImageError}
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

        // biome-ignore lint/a11y/useAltText: alt set via imgProps spread
        // biome-ignore lint/performance/noImgElement: markdown renderer, next/image not applicable here
        return <img {...imgProps} />;
      },
    }),
    [gameCoverImage],
  );

  useEffect(() => {
    setEffectiveCoverImageUrl(transformedCoverImageUrl);
  }, [transformedCoverImageUrl]);

  useEffect(() => {
    if (disableDynamicBackdrop) return;
    setPostCoverUrl(effectiveCoverImageUrl);
    return () => {
      setPostCoverUrl(null);
    };
  }, [setPostCoverUrl, effectiveCoverImageUrl, disableDynamicBackdrop]);

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
  }, []);

  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-thinking]').forEach((el) => {
      el.style.animationDelay = `${-Math.random() * 30}s`;
    });
    root.querySelectorAll<HTMLElement>('code.language-layerone').forEach((el) => {
      el.style.animationDelay = `${-Math.random() * 10}s`;
    });
  }, []);

  return (
    <Box
      component="article"
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: '100%', md: '90%', lg: '80%' },
        mx: 'auto',
        px: { xs: 0, sm: 4 },
        py: { xs: 2.5, sm: 6 },
        ...AMBIENT_PULSE_KEYFRAMES,
      }}
    >
      {/* Back Button */}
      {!hideBackButton && (
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
      )}

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
                <Typography>{post.metadata.author}</Typography>
              </Stack>
            )}
          </Stack>

          {/* Cover Image - Ambient Mode */}
          {effectiveCoverImageUrl && (
            <Box sx={{ mb: 4 }}>
              <AmbientCoverArt
                coverImageUrl={effectiveCoverImageUrl}
                alt={post.metadata.title}
                isScheduledPreview={isScheduledPreview}
                onAspectRatioChange={(val) => setCoverIsLandscape(val)}
                onImageError={(url) => {
                  if (url !== POST_COVER_PLACEHOLDER_IMAGE_URL) {
                    setEffectiveCoverImageUrl(POST_COVER_PLACEHOLDER_IMAGE_URL);
                  }
                }}
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
                              transition:
                                'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
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
                              transition:
                                'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
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
                coverImageUrl={effectiveCoverImageUrl}
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
            <Typography
              level="body-md"
              sx={{ color: 'text.secondary', fontSize: { xs: '1rem', sm: '1.05rem' } }}
            >
              This post is already queued in the site, but it stays hidden until that date begins in
              Portland time.
            </Typography>
            <Typography
              level="body-sm"
              sx={{ mt: 1.5, color: 'text.tertiary', fontSize: '0.98rem' }}
            >
              The full post content and listen-along player will unlock automatically when the
              publish date arrives.
            </Typography>
          </Card>
        ) : (
          <Box
            ref={contentRef}
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
                  },
                },
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
                background:
                  'linear-gradient(to right, rgba(20, 83, 45, 0.6) 0%, rgba(74, 222, 128, 0.25) 50%, rgba(20, 83, 45, 0.6) 100%)',
                backgroundSize: '1000px 100%',
                animation: `${shimmerKeyframes} 6s linear infinite`,
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
                },
              },
              '& pre:has(code.language-layerone)': {
                backgroundColor: '#0d0618 !important',
                border: '1px solid',
                borderColor: 'rgba(0, 255, 200, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                my: 4,
                p: 2,
                borderRadius: 0,
                textAlign: 'center',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background:
                    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 200, 0.04) 2px, rgba(0, 255, 200, 0.04) 4px)',
                  pointerEvents: 'none',
                  zIndex: 1,
                },
                '& code.language-layerone': {
                  backgroundColor: 'transparent !important',
                  color: '#7fffe0',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  p: 0,
                  border: 'none',
                  background: 'none !important',
                  textAlign: 'center',
                  textShadow: '1px 0 rgba(255, 0, 180, 0.4), -1px 0 rgba(0, 200, 255, 0.4)',
                  animation: `${glitchFlickerKeyframes} 6s steps(1) infinite`,
                },
                '& .hljs': {
                  background: 'transparent',
                },
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
              '& [data-thinking]': {
                '--PostView-thinking-color': thinkingColor,
                '--PostView-thinking-glow': thinkingGlowColor,
                '--PostView-thinking-muted': thinkingMutedColor,
                position: 'relative',
                fontStyle: 'italic',
                color: 'var(--PostView-thinking-color)',
                background:
                  'linear-gradient(90deg, var(--PostView-thinking-muted) 0%, var(--PostView-thinking-color) 32%, rgba(255,255,255,0.96) 48%, var(--PostView-thinking-color) 64%, var(--PostView-thinking-muted) 100%)',
                backgroundSize: '260% 100%',
                backgroundPosition: '160% 50%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: `${thinkingPulseKeyframes} 18s ease-in-out infinite`,
              },
              '& [data-thinking="inline"]': {
                textWrap: 'pretty',
              },
              '& [data-thinking="block"]': {
                textAlign: 'center',
                borderLeft: '4px solid',
                borderColor: 'primary.500',
                px: { xs: 3, sm: 4 },
                py: 2,
                my: 6,
                fontStyle: 'italic',
                backgroundColor: 'rgba(139, 92, 246, 0.05)',
                backgroundImage: `linear-gradient(90deg, var(--PostView-thinking-muted) 0%, var(--PostView-thinking-color) 32%, rgba(255,255,255,0.96) 48%, var(--PostView-thinking-color) 64%, var(--PostView-thinking-muted) 100%), none`,
                backgroundSize: '260% 100%, auto',
                backgroundPosition: '160% 50%, 0 0',
                backgroundClip: 'text, border-box',
                WebkitTextFillColor: 'transparent',
                color: 'text.primary',
                boxShadow: `inset 0 0 28px rgba(139, 92, 246, 0.08), 0 0 32px ${thinkingGlowColor}`,
                animation: `${thinkingPulseKeyframes} 18s ease-in-out infinite, ${thinkingFloatKeyframes} 6s ease-in-out infinite`,
                '& p': { my: 0 },
                '& p + p': { mt: 2 },
              },
              '@media (prefers-reduced-motion: reduce)': {
                '& [data-thinking]': {
                  animation: 'none',
                  background: 'none',
                  WebkitTextFillColor: 'currentColor',
                },
                '& [data-thinking="block"]': {
                  animation: 'none',
                  backgroundImage: 'none',
                  backgroundClip: 'border-box',
                  WebkitTextFillColor: 'currentColor',
                  bgcolor: 'rgba(139, 92, 246, 0.05)',
                },
                '& pre code.language-layerone': {
                  animation: 'none',
                  textShadow: 'none',
                  color: '#7fffe0',
                },
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 0,
                my: 4,
                display: 'block',
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.1)',
                background:
                  'linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0) 100%)',
                backgroundSize: '1000px 100%',
                animation: `${shimmerKeyframes} 15s linear infinite`,
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
            {renderChunks.map((chunk) => {
              if (chunk.type === 'card-group' && chunk.cardParts && chunk.cardParts.length > 1) {
                return (
                  <Box
                    key={chunk.key}
                    sx={{
                      my: { xs: 3, sm: 5 },
                      mx: 'auto',
                      width: '100%',
                      border: '1px solid rgba(219, 234, 254, 0.9)',
                      borderRadius: { xs: '24px', sm: '32px' },
                      bgcolor: 'rgba(248,250,252,0.94)',
                      color: '#0f172a',
                      '--joy-fontFamily-body':
                        '"__nextjs-Geist", Inter, var(--joy-fontFamily-fallback)',
                      fontFamily: '"__nextjs-Geist", Inter, var(--joy-fontFamily-fallback)',
                      p: { xs: 1.25, sm: 2 },
                      boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
                      '& p': { m: 0 },
                      '&& img': { m: 0, border: 0, background: 'none', animation: 'none' },
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: `repeat(${Math.min(chunk.cardParts.length, 2)}, 1fr)`,
                        md: `repeat(${Math.min(chunk.cardParts.length, 3)}, 1fr)`,
                      },
                      gap: { xs: 1.5, sm: 2 },
                    }}
                  >
                    {chunk.cardParts.map(
                      (part) =>
                        part.token && (
                          <SpeciesCareCardEmbed
                            key={part.id}
                            data={speciesCareCards[part.token.key]}
                            tokenKey={part.token.key}
                            coverImageUrl={effectiveCoverImageUrl}
                            plain
                          />
                        ),
                    )}
                  </Box>
                );
              }

              if (chunk.type === 'card-group' && chunk.cardParts && chunk.cardParts.length === 1) {
                const part = chunk.cardParts[0]!;
                return (
                  part.token && (
                    <SpeciesCareCardEmbed
                      key={part.id}
                      data={speciesCareCards[part.token.key]}
                      tokenKey={part.token.key}
                      coverImageUrl={effectiveCoverImageUrl}
                    />
                  )
                );
              }

              if (chunk.type === 'markdown' && chunk.markdownPart) {
                const part = chunk.markdownPart;
                const content = part.content ?? '';
                if (!content.trim()) return null;
                return (
                  <ReactMarkdown
                    key={part.id}
                    remarkPlugins={[remarkGfm, remarkThinkingTags]}
                    rehypePlugins={[
                      [rehypeSanitize, markdownSanitizeSchema],
                      rehypeHighlight,
                      rehypeDialogueQuotes,
                    ]}
                    components={markdownComponents}
                  >
                    {content}
                  </ReactMarkdown>
                );
              }

              return null;
            })}
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
