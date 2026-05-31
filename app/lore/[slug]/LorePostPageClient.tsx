'use client';

import { Box } from '@mui/joy';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { ParsedPost } from '@/lib/blog/parser';
import type { LorePostNeighbor } from '@/lib/lore/loader';
import type { SpeciesCareCardEmbedMap } from '@/lib/species-care/types';

const PostView = dynamic(() => import('@/components/blog/PostView').then((mod) => mod.PostView), {
  loading: () => <Box sx={{ minHeight: '100vh' }} />,
  ssr: true,
});

interface LorePostPageClientProps {
  post: ParsedPost;
  previousStory?: LorePostNeighbor | null;
  nextStory?: LorePostNeighbor | null;
  isScheduledPreview?: boolean;
  scheduledPublishDate?: string;
  speciesCareCards?: SpeciesCareCardEmbedMap;
}

export function LorePostPageClient({
  post,
  previousStory = null,
  nextStory = null,
  isScheduledPreview = false,
  scheduledPublishDate,
  speciesCareCards = {},
}: LorePostPageClientProps) {
  const router = useRouter();

  return (
    <PostView
      key={post.filename}
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
    />
  );
}
