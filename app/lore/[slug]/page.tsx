/**
 * Individual Lore Entry Page
 *
 * Reuses the same PostView used for blog posts.
 */

import { notFound } from 'next/navigation';

import { getPublishState } from '@/lib/content/publish';
import {
  loadLorePostBySlug,
  loadLorePostSlugs,
  loadLoreStoryNeighborsForPost,
} from '@/lib/lore/loader';
import { loadSpeciesCareCardsForMarkdown } from '@/lib/species-care/loader';

import { LorePostPageClient } from './LorePostPageClient';

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await loadLorePostSlugs({ includeScheduled: true });
  return slugs.map((slug) => ({
    slug,
  }));
}

export default async function LoreEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadLorePostBySlug(slug, { includeScheduled: true });

  if (!post) {
    notFound();
  }

  const publishState = getPublishState(post.metadata.date);
  const neighbors = await loadLoreStoryNeighborsForPost(post, { includeScheduled: true });
  const speciesCareCards = publishState.isScheduled
    ? {}
    : await loadSpeciesCareCardsForMarkdown(post.content);

  return (
    <LorePostPageClient
      post={post}
      previousStory={neighbors.previous}
      nextStory={neighbors.next}
      isScheduledPreview={publishState.isScheduled}
      scheduledPublishDate={publishState.publishDate ?? undefined}
      speciesCareCards={speciesCareCards}
    />
  );
}
