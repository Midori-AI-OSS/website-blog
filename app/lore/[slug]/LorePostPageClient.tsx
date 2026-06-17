'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import PasswordGate from '@/components/blog/PasswordGate';
import { PostView } from '@/components/blog/PostView';
import { PovPicker } from '@/components/PovPicker';
import type { ParsedPost } from '@/lib/blog/parser';
import type { LorePostNeighbor, PovSibling } from '@/lib/lore/loader';
import type { SpeciesCareCardEmbedMap } from '@/lib/species-care/types';

interface LorePostPageClientProps {
  post: ParsedPost;
  previousStory?: LorePostNeighbor | null;
  nextStory?: LorePostNeighbor | null;
  isScheduledPreview?: boolean;
  scheduledPublishDate?: string;
  speciesCareCards?: SpeciesCareCardEmbedMap;
  gameCoverImage?: string;
  povSiblings?: PovSibling[];
}

export function LorePostPageClient({
  post,
  previousStory = null,
  nextStory = null,
  isScheduledPreview = false,
  scheduledPublishDate,
  speciesCareCards = {},
  gameCoverImage,
  povSiblings,
}: LorePostPageClientProps) {
  const router = useRouter();
  const password = post.metadata.password?.trim();
  const passwordHint = post.metadata.password_hint?.trim();
  const [isLocked, setIsLocked] = useState(!!password);
  const [ttsFadingOut, setTtsFadingOut] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const handleLockedChange = useCallback((locked: boolean) => {
    if (locked) {
      setIsLocked(true);
      setTtsFadingOut(false);
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    } else {
      setTtsFadingOut(true);
      fadeTimerRef.current = setTimeout(() => {
        setIsLocked(false);
        setTtsFadingOut(false);
      }, 400);
    }
  }, []);

  const contentWrapper = password
    ? (content: ReactNode, primaryColor?: string | null) => {
        return (
          <PasswordGate
            key={post.filename}
            password={password}
            hint={passwordHint}
            primaryColor={primaryColor}
            onLockedChange={handleLockedChange}
          >
            {content}
          </PasswordGate>
        );
      }
    : undefined;

  return (
    <>
      <PovPicker siblings={povSiblings ?? []} gameCoverImage={gameCoverImage} />
      <PostView
        post={post}
        onClose={() => router.push('/lore')}
        backButtonLabel="Back to lore"
        backButtonAriaLabel="Back to lore list"
        postType="lore"
        previousStory={
          previousStory
            ? {
                href: `/lore/${previousStory.slug}`,
                title: previousStory.post.metadata.title,
                summary: previousStory.post.metadata.summary,
              }
            : null
        }
        nextStory={
          nextStory
            ? {
                href: `/lore/${nextStory.slug}`,
                title: nextStory.post.metadata.title,
                summary: nextStory.post.metadata.summary,
              }
            : null
        }
        onNavigateStory={(href) => router.push(href)}
        isScheduledPreview={isScheduledPreview}
        scheduledPublishDate={scheduledPublishDate}
        speciesCareCards={speciesCareCards}
        gameCoverImage={gameCoverImage}
        contentWrapper={contentWrapper}
        ttsLocked={isLocked}
        ttsFadingOut={ttsFadingOut}
      />
    </>
  );
}
