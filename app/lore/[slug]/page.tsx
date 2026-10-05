/**
 * Individual Lore Entry Page
 *
 * Reuses the same PostView used for blog posts.
 */

import { notFound } from 'next/navigation';
import {
  fingerprintImageSource,
  fingerprintPostImages,
  fingerprintSpeciesCareCards,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { transformPostImageUrl } from '@/lib/content/imageUrl';
import { getPublishState } from '@/lib/content/publish';
import {
  getLorePostBySlug,
  getLorePostSlug,
  getLorePostsForGame,
  getLoreStoryNeighbors,
  getPovSiblings,
  loadAllLorePosts,
  loadLoreGameIndexes,
  type PovSibling,
  sortLorePosts,
} from '@/lib/lore/loader';
import { loadSpeciesCareCardsForMarkdown } from '@/lib/species-care/loader';

import { LorePostPageClient } from './LorePostPageClient';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const posts = await loadAllLorePosts({ includeScheduled: true });
  return posts.map((post) => ({
    slug: post.filename.replace('.md', ''),
  }));
}

export default async function LoreEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [allPosts, gameIndexes] = await Promise.all([
    loadAllLorePosts({ includeScheduled: true }),
    loadLoreGameIndexes(),
  ]);
  const post = getLorePostBySlug(allPosts, slug);

  if (!post) {
    notFound();
  }

  const matchingGame = post.metadata.game
    ? gameIndexes.find((index) => index.slug === post.metadata.game)
    : undefined;
  const gameCoverImage = matchingGame?.coverImage
    ? transformPostImageUrl(await fingerprintImageSource(matchingGame.coverImage))
    : undefined;
  const povsEnabled = matchingGame?.povsEnabled !== false;

  const publishState = getPublishState(post.metadata.date);
  const neighbors = getLoreStoryNeighbors(allPosts, post);
  const loadedSpeciesCareCards = publishState.isScheduled
    ? {}
    : await loadSpeciesCareCardsForMarkdown(post.content);
  const [fingerprintedPost, speciesCareCards, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(post),
    fingerprintSpeciesCareCards(loadedSpeciesCareCards),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  const rawPovSiblings = povsEnabled ? getPovSiblings(allPosts, post) : [];
  const povSiblings: PovSibling[] = await Promise.all(
    rawPovSiblings.map(async (sib) => ({
      ...sib,
      coverImage: sib.coverImage
        ? transformPostImageUrl(await fingerprintImageSource(sib.coverImage))
        : undefined,
    })),
  );

  let gameStories:
    | Array<{ slug: string; title: string; summary?: string; coverImage?: string }>
    | undefined;
  if (!povsEnabled && matchingGame) {
    const currentSlug = getLorePostSlug(post);
    const gamePosts = sortLorePosts(
      getLorePostsForGame(allPosts, matchingGame.slug),
      'story_order_desc',
    );
    gameStories = await Promise.all(
      gamePosts
        .filter((p) => getLorePostSlug(p) !== currentSlug)
        .map(async (p) => ({
          slug: getLorePostSlug(p),
          title: p.metadata.title,
          summary: p.metadata.summary,
          coverImage: p.metadata.cover_image?.trim()
            ? transformPostImageUrl(await fingerprintImageSource(p.metadata.cover_image.trim()))
            : undefined,
        })),
    );
  }

  return (
    <LorePostPageClient
      post={fingerprintedPost}
      previousStory={neighbors.previous}
      nextStory={neighbors.next}
      isScheduledPreview={publishState.isScheduled}
      scheduledPublishDate={publishState.publishDate ?? undefined}
      speciesCareCards={speciesCareCards}
      gameCoverImage={gameCoverImage}
      placeholderImageUrl={placeholderImageUrl}
      povSiblings={povSiblings}
      povsEnabled={povsEnabled}
      gameStories={gameStories}
    />
  );
}
