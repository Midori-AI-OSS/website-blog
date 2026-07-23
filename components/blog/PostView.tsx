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

import { Global, keyframes } from '@emotion/react';
import { Box, Button, Card, Chip, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/joy';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Lock, Tag, User } from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { AMBIENT_PULSE_KEYFRAMES, AmbientCoverArt } from '@/components/blog/AmbientCoverArt';
import { useDynamicBackdrop } from '@/components/DynamicBackdropProvider';
import { SpeciesCareCardEmbed } from '@/components/species-care/SpeciesCareCardEmbed';
import { shouldInsertSpaceBetweenTitleSegments } from '@/lib/blog/titleSegments';
import { POST_COVER_PLACEHOLDER_IMAGE_URL, resolvePostCoverImageUrl } from '@/lib/content/imageUrl';
import {
  extractIsoDateFromBlogFilename,
  formatLongDate,
  normalizeIsoDateString,
} from '@/lib/content/publish';
import { LORE_IMAGE_TOKEN_TITLE, preparePostMarkdown } from '@/lib/markdown/postMarkdown';
import rehypeDialogueQuotes from '@/lib/markdown/rehypeDialogueQuotes';
import remarkFictionalLangTags from '@/lib/markdown/remarkFictionalLangTags';
import remarkThinkingTags from '@/lib/markdown/remarkThinkingTags';
import { splitMarkdownSpeciesCareTokens } from '@/lib/species-care/tokens';
import type { SpeciesCareCardEmbedMap } from '@/lib/species-care/types';
import {
  DEFAULT_ART_PALETTE,
  type ExtractedPalette,
  extractPaletteFromImage,
} from '@/lib/theme/artPalette';
import type { TtsHighlightRange } from '@/lib/tts/contract';
import { applyTtsHighlight, clearTtsHighlights } from '@/lib/tts/highlight';
import { deriveSpeechDocument, type SpeechDocument } from '@/lib/tts/speechDocument';
import type { ParsedPost } from '../../lib/blog/parser';
import { TtsPlayer } from './TtsPlayer';

const WEAVE_BLUE = '#bae6fd';

const shimmerKeyframes = keyframes({
  '0%': { backgroundPosition: '-1000px 0' },
  '100%': { backgroundPosition: '1000px 0' },
});

const thinkingPulseKeyframes = keyframes({
  '0%, 100%': {
    opacity: 0.92,
    backgroundPosition: '160% 50%',
    textShadow: 'var(--PostView-thinking-static-shadow, 0 0 0 transparent)',
  },
  '50%': {
    opacity: 1,
    backgroundPosition: '20% 50%',
    textShadow:
      'var(--PostView-thinking-static-shadow, 0 0 0 transparent), 0 0 18px var(--PostView-thinking-glow)',
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

const thinkingTitleIntroKeyframes = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translate3d(-8px, 0, 0)',
  },
  '14%': {
    opacity: 1,
    transform: 'translate3d(5px, -1px, 0)',
  },
  '22%': {
    opacity: 0.68,
    transform: 'translate3d(-4px, 1px, 0)',
  },
  '36%': {
    opacity: 1,
    transform: 'translate3d(2px, 0, 0)',
  },
  '100%': {
    opacity: 1,
    transform: 'translate3d(0, 0, 0)',
  },
});

const thinkingTitleShearKeyframes = keyframes({
  '0%, 95%, 100%': {
    textShadow: '1px 0 rgba(251,113,133,0.25), -1px 0 rgba(186,230,253,0.25)',
    transform: 'translateX(0)',
  },
  '96%': {
    textShadow: '3px 0 rgba(251,113,133,0.35), -3px 0 rgba(186,230,253,0.35)',
    transform: 'translateX(-3px) skewX(-0.6deg)',
  },
  '97%': {
    textShadow: '-3px 0 rgba(251,113,133,0.4), 3px 0 rgba(186,230,253,0.4)',
    transform: 'translateX(3px) skewX(0.5deg)',
  },
  '98%': {
    textShadow: '2px 0 rgba(251,113,133,0.15), -2px 0 rgba(186,230,253,0.15)',
    transform: 'translateX(-1px)',
  },
});

const thinkingTitleSliceKeyframes = keyframes({
  '0%, 95%, 100%': {
    clipPath: 'inset(0 0 100% 0)',
    transform: 'translateX(0)',
    opacity: 0,
  },
  '96%': {
    clipPath: 'inset(18% 0 60% 0)',
    transform: 'translateX(-8px)',
    opacity: 0.45,
  },
  '97%': {
    clipPath: 'inset(65% 0 12% 0)',
    transform: 'translateX(10px)',
    opacity: 0.4,
  },
  '98%': {
    clipPath: 'inset(0 0 100% 0)',
    transform: 'translateX(0)',
    opacity: 0,
  },
});

const revealBackspaceKeyframes = keyframes({
  from: { clipPath: 'inset(0 0% 0 0)' },
  to: { clipPath: 'inset(0 100% 0 0)' },
});

const revealTypeKeyframes = keyframes({
  from: { clipPath: 'inset(0 100% 0 0)' },
  to: { clipPath: 'inset(0 0% 0 0)' },
});

const revealCursorKeyframes = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0 },
});

const REVEAL_REVERSE_DELAY_MS = 5000;
const REVEAL_HALF_MS_PER_CHARACTER = 40;
const REVEAL_MIN_HALF_MS = 160;

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
  /** Optional wrapper applied to the main post body */
  contentWrapper?: (content: ReactNode, primaryColor?: string | null) => ReactNode;
  /** When true, renders a lock overlay over the TTS player */
  ttsLocked?: boolean;
  /** Signals the TTS overlay is fading out. Overlay renders with opacity 0 during transition. */
  ttsFadingOut?: boolean;
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

const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ['data-thinking', 'inline', 'block'],
      ['data-lang'],
      ['data-reveal'],
    ],
    div: [...(defaultSchema.attributes?.div ?? []), ['data-thinking', 'inline', 'block']],
  },
};

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

interface PostContentSectionProps {
  post: ParsedPost;
  isScheduledPreview: boolean;
  scheduledPublishLabel: string;
  speciesCareCards: SpeciesCareCardEmbedMap;
  effectiveCoverImageUrl: string;
  gameCoverImage?: string;
  dialogueColor: string;
  thinkingColor: string;
  thinkingGlowColor: string;
  thinkingMutedColor: string;
  speechDocument: SpeechDocument;
  ttsHighlightRange: TtsHighlightRange | null;
}

function PostContentSection({
  post,
  isScheduledPreview,
  scheduledPublishLabel,
  speciesCareCards,
  effectiveCoverImageUrl,
  gameCoverImage,
  dialogueColor,
  thinkingColor,
  thinkingGlowColor,
  thinkingMutedColor,
  speechDocument,
  ttsHighlightRange,
}: PostContentSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Wire this up to the button when Luna is ready.
  const [ttsAutoFollowEnabled] = useState(true);
  const followSuppressedRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const previousSpeechDocumentRef = useRef(speechDocument);

  const markdownContent = useMemo(() => {
    return preparePostMarkdown(post.content);
  }, [post.content]);
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
  const markdownComponents = useMemo<Components>(
    () => ({
      span: (props) => {
        const { node: _node, children, ...spanProps } = props;
        const dataAttributes = spanProps as Record<string, unknown>;
        const isReveal = dataAttributes['data-reveal'] === 'true';
        const dataLang = dataAttributes['data-lang'];

        if (isReveal && (dataLang === 'celestial' || dataLang === 'abyssal')) {
          return (
            <span {...spanProps}>
              <span data-reveal-content="true">{children}</span>
            </span>
          );
        }

        return <span {...spanProps}>{children}</span>;
      },
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
            <Box
              component="span"
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
                width: '100%',
              }}
            >
              <Box
                component="span"
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
                  maxHeight: '95vh',
                  height: 'auto',
                  display: 'block',
                  my: 0,
                  border: 'none',
                  background: 'none',
                  animation: 'none',
                }}
              />
            </Box>
          );
        }

        // biome-ignore lint/a11y/useAltText: alt set via imgProps spread
        // biome-ignore lint/performance/noImgElement: markdown renderer, next/image not applicable here
        return <img {...imgProps} />;
      },
    }),
    [gameCoverImage],
  );

  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-thinking]').forEach((el) => {
      el.style.animationDelay = `${-Math.random() * 30}s`;
    });
    root.querySelectorAll<HTMLElement>('code.language-layerone').forEach((el) => {
      el.style.animationDelay = `${-Math.random() * 10}s`;
    });

    const revealCleanups: Array<() => void> = [];

    root.querySelectorAll<HTMLElement>('[data-reveal="true"]').forEach((el) => {
      const text = el.textContent ?? '';
      const characterCount = Math.max(1, Array.from(text).length);
      const revealHalfMs = Math.max(
        REVEAL_MIN_HALF_MS,
        characterCount * REVEAL_HALF_MS_PER_CHARACTER,
      );

      el.style.setProperty('--reveal-chars', String(characterCount));
      el.style.setProperty('--reveal-duration', `${(revealHalfMs * 2) / 1000}s`);
      el.style.setProperty('--reveal-half', `${revealHalfMs / 1000}s`);
      el.style.setProperty('--reveal-steps', `steps(${characterCount}, end)`);

      const forwardTimers: number[] = [];
      const reverseTimers: number[] = [];
      let reverseDelayTimer: number | null = null;

      const clearTimerList = (timers: number[]) => {
        timers.forEach((timer) => {
          window.clearTimeout(timer);
        });
        timers.length = 0;
      };

      const clearForwardTimers = () => clearTimerList(forwardTimers);
      const clearReverseTimers = () => {
        clearTimerList(reverseTimers);
        if (reverseDelayTimer !== null) {
          window.clearTimeout(reverseDelayTimer);
          reverseDelayTimer = null;
        }
      };

      const restartPhase = (phase: string) => {
        const revealContent = el.querySelector<HTMLElement>('[data-reveal-content="true"]');
        el.removeAttribute('data-reveal-phase');
        if (revealContent) {
          revealContent.style.animation = 'none';
          revealContent.getBoundingClientRect();
          revealContent.style.animation = '';
        }
        el.setAttribute('data-reveal-phase', phase);
      };

      const completeForward = () => {
        el.removeAttribute('data-reveal-phase');
        el.setAttribute('data-reveal-translated', 'true');
      };

      const completeReverse = () => {
        el.removeAttribute('data-reveal-phase');
        el.removeAttribute('data-reveal-translated');
      };

      const startForward = () => {
        clearForwardTimers();
        clearReverseTimers();

        if (
          el.getAttribute('data-reveal-translated') === 'true' &&
          !el.hasAttribute('data-reveal-phase')
        ) {
          return;
        }

        el.removeAttribute('data-reveal-translated');
        restartPhase('backspace');

        forwardTimers.push(
          window.setTimeout(() => {
            el.setAttribute('data-reveal-translated', 'true');
            restartPhase('type');
          }, revealHalfMs),
        );
        forwardTimers.push(window.setTimeout(completeForward, revealHalfMs * 2));
      };

      const startReverse = () => {
        clearForwardTimers();
        clearReverseTimers();
        el.setAttribute('data-reveal-translated', 'true');
        restartPhase('reverse-backspace');

        reverseTimers.push(
          window.setTimeout(() => {
            el.removeAttribute('data-reveal-translated');
            restartPhase('reverse-type');
          }, revealHalfMs),
        );
        reverseTimers.push(window.setTimeout(completeReverse, revealHalfMs * 2));
      };

      const handleMouseEnter = () => startForward();
      const handleMouseLeave = () => {
        clearReverseTimers();
        reverseDelayTimer = window.setTimeout(startReverse, REVEAL_REVERSE_DELAY_MS);
      };

      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);

      revealCleanups.push(() => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
        clearForwardTimers();
        clearReverseTimers();
      });
    });

    return () => {
      revealCleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, []);

  useEffect(() => {
    if (!ttsHighlightRange) return;

    const shouldSuppress = () => {
      if (programmaticScrollRef.current) return;
      followSuppressedRef.current = true;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, select, [contenteditable="true"]') ||
        !['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key)
      ) {
        return;
      }
      shouldSuppress();
    };

    window.addEventListener('wheel', shouldSuppress, { passive: true });
    window.addEventListener('touchmove', shouldSuppress, { passive: true });
    window.addEventListener('scroll', shouldSuppress, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', shouldSuppress);
      window.removeEventListener('touchmove', shouldSuppress);
      window.removeEventListener('scroll', shouldSuppress);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [ttsHighlightRange]);

  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    if (previousSpeechDocumentRef.current !== speechDocument) {
      clearTtsHighlights(root);
      previousSpeechDocumentRef.current = speechDocument;
    }

    if (!ttsHighlightRange) {
      clearTtsHighlights(root, { normal: 'transition', layerone: 'linger' });
      return;
    }

    applyTtsHighlight(root, speechDocument, ttsHighlightRange);
    if (!ttsAutoFollowEnabled || followSuppressedRef.current) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>(
        'pre.tts-layerone-active, .tts-highlight--entering, .tts-highlight--active',
      ),
    );
    if (targets.length === 0) return;

    const first = targets[0];
    const last = targets.at(-1);
    if (!first || !last) return;
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const target = firstRect.top < 0 ? first : lastRect.bottom > window.innerHeight ? last : null;
    if (!target) return;

    programmaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current !== null) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticScrollTimerRef.current = null;
    }, 1000);
  }, [speechDocument, ttsAutoFollowEnabled, ttsHighlightRange]);

  useLayoutEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current !== null) {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }
      const root = contentRef.current;
      if (root) clearTtsHighlights(root);
    };
  }, []);

  return (
    <>
      <Global
        styles={`
          @font-face {
            font-family: 'Celestial';
            src: url('/fonts/Celestial.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Infernal';
            src: url('/fonts/Infernal.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          @property --tts-layerone-red-alpha {
            syntax: '<number>';
            inherits: false;
            initial-value: 0;
          }
          @keyframes tts-watercolor {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
          }
          @keyframes tts-highlight-wipe-in {
            0% { background-size: 0% 100%; color: inherit; }
            100% { background-size: 200% 100%; color: var(--tts-highlight-color); }
          }
          @keyframes tts-highlight-wipe-out {
            0% { background-size: 200% 100%; color: var(--tts-highlight-color); }
            100% { background-size: 0% 100%; color: inherit; }
          }
          @keyframes tts-layerone-switch-block {
            0% {
              --tts-layerone-red-alpha: 0;
              border-color: rgba(0, 255, 200, 0.25);
              box-shadow: none;
            }
            20% {
              --tts-layerone-red-alpha: 0.4;
              border-color: rgba(239, 68, 68, 0.95);
              box-shadow: 0 0 10px rgba(239, 68, 68, 0.28);
            }
            38% {
              --tts-layerone-red-alpha: 0.12;
              border-color: rgba(0, 255, 200, 0.35);
              box-shadow: 0 0 3px rgba(239, 68, 68, 0.12);
            }
            58%, 100% {
              --tts-layerone-red-alpha: 0.4;
              border-color: rgba(239, 68, 68, 0.95);
              box-shadow: 0 0 10px rgba(239, 68, 68, 0.28);
            }
          }
          @keyframes tts-layerone-switch-text {
            0% { color: #7fffe0; transform: translateX(0); }
            20% { color: #e2e8f0; transform: translateX(1px); }
            38% { color: #7fffe0; transform: translateX(-1px); }
            58%, 100% { color: #e2e8f0; transform: translateX(0); }
          }
          .tts-highlight {
            --tts-highlight-color: color-mix(in srgb, currentColor 75%, #e2e8f0 25%);
            background-repeat: no-repeat;
            background-position: left center;
            background-size: 200% 100%;
            border-radius: 3px;
            padding: 1px 0;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
            color: inherit;
          }
          .tts-highlight--statement {
            background-image: linear-gradient(
              120deg,
              rgba(139, 92, 246, 0.14),
              rgba(167, 139, 250, 0.28),
              rgba(139, 92, 246, 0.14)
            );
          }
          .tts-highlight--chunk {
            --tts-highlight-color: color-mix(in srgb, currentColor 90%, #e2e8f0 10%);
            background-image: linear-gradient(
              120deg,
              rgba(139, 92, 246, 0.10),
              rgba(167, 139, 250, 0.20),
              rgba(139, 92, 246, 0.10)
            );
          }
          [data-dialogue='true'] .tts-highlight--statement {
            --tts-highlight-color: color-mix(in srgb, currentColor 70%, #e2e8f0 30%);
          }
          [data-dialogue='true'] .tts-highlight--chunk {
            --tts-highlight-color: color-mix(in srgb, currentColor 80%, #e2e8f0 20%);
          }
          [data-thinking] .tts-highlight {
            -webkit-text-fill-color: currentColor;
          }
          .tts-highlight--entering {
            animation: tts-highlight-wipe-in var(--tts-handoff-ms) ease-in forwards;
          }
          .tts-highlight--active {
            color: var(--tts-highlight-color);
            animation: tts-watercolor 8s ease-in-out infinite alternate;
          }
          .tts-highlight--exiting {
            background-position: right center;
            animation: tts-highlight-wipe-out var(--tts-handoff-ms) ease-in forwards;
          }
          pre.tts-layerone-active,
          pre.tts-layerone-lingering {
            background-image: linear-gradient(
              rgba(239, 68, 68, var(--tts-layerone-red-alpha)),
              rgba(239, 68, 68, var(--tts-layerone-red-alpha))
            ) !important;
          }
          pre.tts-layerone-active {
            --tts-layerone-red-alpha: 0.4;
            border-color: rgba(239, 68, 68, 0.95) !important;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.28);
          }
          pre.tts-layerone-active code.language-layerone {
            color: #e2e8f0 !important;
            -webkit-text-fill-color: #e2e8f0 !important;
          }
          pre.tts-layerone-entering {
            animation: tts-layerone-switch-block 600ms steps(1, end) forwards;
          }
          pre.tts-layerone-entering code.language-layerone {
            animation: tts-layerone-switch-text 600ms steps(1, end) forwards !important;
          }
          pre.tts-layerone-lingering {
            --tts-layerone-red-alpha: 0;
            border-color: rgba(0, 255, 200, 0.25) !important;
            box-shadow: none;
            transition:
              --tts-layerone-red-alpha 10s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 10s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 10s cubic-bezier(0.16, 1, 0.3, 1);
          }
          pre.tts-layerone-lingering code.language-layerone {
            color: #7fffe0 !important;
            -webkit-text-fill-color: #7fffe0 !important;
            transition:
              color 10s cubic-bezier(0.16, 1, 0.3, 1),
              -webkit-text-fill-color 10s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @media (prefers-reduced-motion: reduce) {
            .tts-highlight--entering,
            .tts-highlight--active,
            .tts-highlight--exiting {
              animation: none !important;
              background-size: 200% 100%;
              color: var(--tts-highlight-color);
            }
            pre.tts-layerone-entering,
            pre.tts-layerone-entering code.language-layerone {
              animation: none !important;
            }
            pre.tts-layerone-lingering,
            pre.tts-layerone-lingering code.language-layerone {
              transition: none !important;
            }
          }
          @supports not (color: color-mix(in srgb, white, black)) {
            .tts-highlight {
              --tts-highlight-color: inherit;
              color: inherit;
            }
          }
        `}
      />
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
          <Typography level="body-sm" sx={{ mt: 1.5, color: 'text.tertiary', fontSize: '0.98rem' }}>
            The full post content and listen-along player will unlock automatically when the publish
            date arrives.
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
              display: 'block',
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
            '& [data-lang="celestial"]': { fontFamily: '"Celestial", serif' },
            '& [data-lang="abyssal"]': {
              fontFamily: '"Infernal", serif',
              fontSize: '0.95em',
            },
            '& [data-reveal="true"]': {
              position: 'relative',
              display: 'inline',
              verticalAlign: 'baseline',
              fontFamily: 'inherit',
              '& > [data-reveal-content="true"]': {
                display: 'inline-block',
                lineHeight: 1,
                verticalAlign: 'text-bottom',
                clipPath: 'inset(0 0% 0 0)',
                overflow: 'hidden',
                willChange: 'clip-path',
              },
              '&[data-lang="celestial"] > [data-reveal-content="true"]': {
                fontFamily: '"Celestial", serif',
              },
              '&[data-lang="abyssal"] > [data-reveal-content="true"]': {
                fontFamily: '"Infernal", serif',
              },
              '&::after': {
                content: '"\\007C"',
                position: 'absolute',
                left: '100%',
                top: 0,
                pointerEvents: 'none',
                opacity: 0,
              },
              '&[data-reveal-translated="true"] > [data-reveal-content="true"], &[data-reveal-phase="type"] > [data-reveal-content="true"], &[data-reveal-phase="reverse-backspace"] > [data-reveal-content="true"]':
                {
                  fontFamily: 'inherit !important',
                },
              '&[data-reveal-phase="backspace"] > [data-reveal-content="true"], &[data-reveal-phase="reverse-backspace"] > [data-reveal-content="true"]':
                {
                  animation: `${revealBackspaceKeyframes} var(--reveal-half) var(--reveal-steps) forwards`,
                },
              '&[data-reveal-phase="type"] > [data-reveal-content="true"], &[data-reveal-phase="reverse-type"] > [data-reveal-content="true"]':
                {
                  animation: `${revealTypeKeyframes} var(--reveal-half) var(--reveal-steps) forwards`,
                },
              '&[data-reveal-phase]::after': {
                opacity: 1,
                animation: `${revealCursorKeyframes} 0.8s steps(1) infinite`,
              },
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
              // Always reveal fictional lang text under reduced motion (no animation)
              '& [data-reveal="true"]': {
                fontFamily: 'inherit !important',
                '& > [data-reveal-content="true"]': {
                  animation: 'none',
                  clipPath: 'none',
                  fontFamily: 'inherit !important',
                  overflow: 'visible',
                },
                '&::after': { content: '""' },
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
                    '--joy-fontFamily-body': 'Inter, var(--joy-fontFamily-fallback)',
                    fontFamily: 'Inter, var(--joy-fontFamily-fallback)',
                    p: { xs: 1.25, sm: 2 },
                    boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
                    '& p': { m: 0 },
                    '&& img': { m: 0, border: 0, background: 'none', animation: 'none' },
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: chunk.cardParts.length >= 3 ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
                    },
                    gap: { xs: 1.5, sm: 2 },
                    ...(chunk.cardParts.length === 2 && {
                      '& > *:nth-of-type(1)': { gridColumn: { md: '2 / 4' } },
                      '& > *:nth-of-type(2)': { gridColumn: { md: '4 / 6' } },
                    }),
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
              const part = chunk.cardParts.at(0);

              return (
                part?.token && (
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
                  remarkPlugins={[remarkGfm, remarkThinkingTags, remarkFictionalLangTags]}
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
    </>
  );
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
  contentWrapper,
  ttsLocked = false,
  ttsFadingOut = false,
}: PostViewProps) {
  const { setPostCoverUrl } = useDynamicBackdrop();
  const [, setCoverIsLandscape] = useState<boolean | null>(null);
  const [ttsPrimaryColor, setTtsPrimaryColor] = useState<string | null>(null);
  const [titlePalette, setTitlePalette] = useState<ExtractedPalette>(DEFAULT_ART_PALETTE);
  const [ttsHighlightRange, setTtsHighlightRange] = useState<TtsHighlightRange | null>(null);
  const speechDocument = useMemo(() => deriveSpeechDocument(post.content), [post.content]);
  const handleTtsHighlightChange = useCallback((range: TtsHighlightRange | null) => {
    setTtsHighlightRange(range);
  }, []);

  const dateString = useMemo(
    () => getPostDateString(post),
    [post.filename, post.metadata.date, post],
  );
  const formattedDate = useMemo(() => formatLongDate(dateString) ?? 'Unknown date', [dateString]);
  const scheduledPublishLabel = useMemo(
    () => formatLongDate(scheduledPublishDate ?? dateString) ?? formattedDate,
    [scheduledPublishDate, dateString, formattedDate],
  );
  const transformedCoverImageUrl = useMemo(
    () => resolvePostCoverImageUrl(post.metadata.cover_image),
    [post.metadata.cover_image],
  );
  const [effectiveCoverImageUrl, setEffectiveCoverImageUrl] = useState(transformedCoverImageUrl);
  const hasThinkingTitleFx = postType === 'lore' && post.metadata.hasThinkingTitle;
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
  const thinkingTitleTintColor = useMemo(() => titlePalette.primary, [titlePalette.primary]);
  const thinkingTitleGradient = useMemo(
    () =>
      `linear-gradient(118deg, ${thinkingTitleTintColor} 0%, ${WEAVE_BLUE} 20%, rgba(255,255,255,0.98) 36%, ${thinkingTitleTintColor} 56%, ${WEAVE_BLUE} 78%, ${thinkingTitleTintColor} 100%)`,
    [thinkingTitleTintColor],
  );
  const thinkingTitleGlow = useMemo(
    () => hexToRgba(thinkingTitleTintColor, 0.6, 'rgba(125, 211, 252, 0.6)'),
    [thinkingTitleTintColor],
  );
  const thinkingTitleBlueGlow = useMemo(
    () => hexToRgba(WEAVE_BLUE, 0.34, 'rgba(186, 230, 253, 0.34)'),
    [],
  );
  const hasLoreStoryNavigation = postType === 'lore' && (previousStory || nextStory);
  const renderedThinkingTitle = useMemo(() => {
    if (!hasThinkingTitleFx || !post.metadata.titleSegments) {
      return null;
    }

    let segmentOffset = 0;
    let previousSegmentText: string | null = null;

    return post.metadata.titleSegments.map((segment) => {
      const needsLeadingSpace = shouldInsertSpaceBetweenTitleSegments(
        previousSegmentText,
        segment.text,
      );
      const segmentKey = `${segment.isThinking ? 'thinking' : 'plain'}-${segmentOffset}-${segment.text}`;
      segmentOffset += segment.text.length + (needsLeadingSpace ? 1 : 0);
      previousSegmentText = segment.text;

      if (segment.isThinking) {
        return (
          <Box
            component="span"
            key={segmentKey}
            data-thinking-title-intro="true"
            sx={{
              display: 'inline-block',
              maxWidth: '100%',
              animation: `${thinkingTitleIntroKeyframes} 1.5s ease-out both`,
            }}
          >
            {needsLeadingSpace ? ' ' : ''}
            <Box
              component="span"
              sx={{
                position: 'relative',
                display: 'inline-block',
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                  pointerEvents: 'none',
                  color: 'rgba(251, 113, 133, 0.4)',
                  mixBlendMode: 'screen',
                  animation: `${thinkingTitleSliceKeyframes} 11.3s steps(1, end) infinite`,
                  '@media (prefers-reduced-motion: reduce)': { display: 'none' },
                }}
              >
                {segment.text}
              </Box>
              <Box
                component="span"
                data-thinking-title="true"
                sx={{
                  '--PostView-thinking-glow': thinkingTitleGlow,
                  position: 'relative',
                  zIndex: 1,
                  display: 'inline-block',
                  background: thinkingTitleGradient,
                  backgroundSize: '240% 100%',
                  backgroundPosition: '160% 50%',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 0 14px ${thinkingTitleBlueGlow})`,
                  animation: `${thinkingPulseKeyframes} 10.5s ease-in-out infinite, ${thinkingTitleShearKeyframes} 11s steps(1, end) infinite`,
                }}
              >
                {segment.text}
              </Box>
            </Box>
          </Box>
        );
      }

      return (
        <Box component="span" key={segmentKey}>
          {needsLeadingSpace ? ' ' : ''}
          {segment.text}
        </Box>
      );
    });
  }, [
    hasThinkingTitleFx,
    post.metadata.titleSegments,
    thinkingTitleBlueGlow,
    thinkingTitleGlow,
    thinkingTitleGradient,
  ]);

  useEffect(() => {
    setEffectiveCoverImageUrl(transformedCoverImageUrl);
  }, [transformedCoverImageUrl]);

  useEffect(() => {
    if (ttsLocked || ttsFadingOut) setTtsHighlightRange(null);
  }, [ttsFadingOut, ttsLocked]);

  useEffect(() => {
    if (!hasThinkingTitleFx) {
      setTitlePalette(DEFAULT_ART_PALETTE);
      return;
    }

    let active = true;

    const syncTitlePalette = async () => {
      const extracted = await extractPaletteFromImage(effectiveCoverImageUrl, {
        fallback: DEFAULT_ART_PALETTE,
      });
      if (!active) return;
      setTitlePalette(extracted);
    };

    void syncTitlePalette();

    return () => {
      active = false;
    };
  }, [effectiveCoverImageUrl, hasThinkingTitleFx]);

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
              overflowWrap: 'anywhere',
              background: 'linear-gradient(to right, #fff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              ...(hasThinkingTitleFx && {
                '@media (prefers-reduced-motion: reduce)': {
                  '& [data-thinking-title-intro="true"]': {
                    animation: 'none',
                  },
                  '& [data-thinking-title="true"]': {
                    animation: 'none',
                    backgroundPosition: '45% 50%',
                    textShadow: '1px 0 rgba(251,113,133,0.25), -1px 0 rgba(186,230,253,0.25)',
                  },
                },
              }),
            }}
          >
            {renderedThinkingTitle ? renderedThinkingTitle : post.metadata.title}
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
            <Box sx={{ mb: 4, position: 'relative' }}>
              {!ttsLocked && !ttsFadingOut ? (
                <TtsPlayer
                  slug={post.filename.replace(/\.md$/, '')}
                  type={postType}
                  document={speechDocument}
                  onPrimaryColorChange={setTtsPrimaryColor}
                  onHighlightChange={handleTtsHighlightChange}
                  coverImageUrl={effectiveCoverImageUrl}
                />
              ) : (
                <Box
                  aria-label="Audio unlocks with this post"
                  sx={{
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(19, 10, 30, 0.7)',
                    backdropFilter: 'blur(4px)',
                    opacity: ttsFadingOut ? 0 : 1,
                    transition: 'opacity 0.4s ease',
                  }}
                >
                  <Lock size={20} color="var(--joy-palette-primary-400)" />
                </Box>
              )}
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

        {contentWrapper ? (
          contentWrapper(
            <PostContentSection
              post={post}
              isScheduledPreview={isScheduledPreview}
              scheduledPublishLabel={scheduledPublishLabel}
              speciesCareCards={speciesCareCards}
              effectiveCoverImageUrl={effectiveCoverImageUrl}
              gameCoverImage={gameCoverImage}
              dialogueColor={dialogueColor}
              thinkingColor={thinkingColor}
              thinkingGlowColor={thinkingGlowColor}
              thinkingMutedColor={thinkingMutedColor}
              speechDocument={speechDocument}
              ttsHighlightRange={ttsHighlightRange}
            />,
            ttsPrimaryColor,
          )
        ) : (
          <PostContentSection
            post={post}
            isScheduledPreview={isScheduledPreview}
            scheduledPublishLabel={scheduledPublishLabel}
            speciesCareCards={speciesCareCards}
            effectiveCoverImageUrl={effectiveCoverImageUrl}
            gameCoverImage={gameCoverImage}
            dialogueColor={dialogueColor}
            thinkingColor={thinkingColor}
            thinkingGlowColor={thinkingGlowColor}
            thinkingMutedColor={thinkingMutedColor}
            speechDocument={speechDocument}
            ttsHighlightRange={ttsHighlightRange}
          />
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
