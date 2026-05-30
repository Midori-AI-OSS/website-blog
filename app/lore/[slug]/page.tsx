/**
 * Individual Lore Entry Page
 *
 * Reuses the same PostView used for blog posts.
 */

import { notFound } from 'next/navigation';

import { getPublishState } from '@/lib/content/publish';
import { getLorePostBySlug, getLoreStoryNeighbors, loadAllLorePosts } from '@/lib/lore/loader';
import { loadSpeciesCareCardsForMarkdown } from '@/lib/species-care/loader';

import { LorePostPageClient } from './LorePostPageClient';

export const revalidate = 300;

export async function generateStaticParams() {
  const posts = await loadAllLorePosts({ includeScheduled: true });
  return posts.map((post) => ({
    slug: post.filename.replace('.md', ''),
  }));
}

export default async function LoreEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const allPosts = await loadAllLorePosts({ includeScheduled: true });
  const post = getLorePostBySlug(allPosts, slug);

  if (!post) {
    notFound();
  }

  const publishState = getPublishState(post.metadata.date);
  const neighbors = getLoreStoryNeighbors(allPosts, post);
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
