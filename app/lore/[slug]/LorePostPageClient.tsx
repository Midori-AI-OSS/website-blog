'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import PasswordGate from '@/components/blog/PasswordGate';
import { PostView } from '@/components/blog/PostView';
import type { ParsedPost } from '@/lib/blog/parser';
import type { LorePostNeighbor } from '@/lib/lore/loader';
import type { SpeciesCareCardEmbedMap } from '@/lib/species-care/types';

interface LorePostPageClientProps {
  post: ParsedPost;
  previousStory?: LorePostNeighbor | null;
  nextStory?: LorePostNeighbor | null;
  isScheduledPreview?: boolean;
  scheduledPublishDate?: string;
  speciesCareCards?: SpeciesCareCardEmbedMap;
  gameCoverImage?: string;
}

export function LorePostPageClient({
  post,
  previousStory = null,
  nextStory = null,
  isScheduledPreview = false,
  scheduledPublishDate,
  speciesCareCards = {},
  gameCoverImage,
}: LorePostPageClientProps) {
  const router = useRouter();
  const password = post.metadata.password?.trim();
  const contentWrapper = password
    ? (content: ReactNode) => {
        return (
          <PasswordGate key={post.filename} password={password}>
            {content}
          </PasswordGate>
        );
      }
    : undefined;

  return (
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
    />
  );
}
