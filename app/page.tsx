import HomePageClient from '@/components/HomePageClient';
import { getRecentPosts, loadAllPosts } from '@/lib/blog/loader';
import type { ParsedPost } from '@/lib/blog/parser';
import {
  fingerprintPosts,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { loadAllLorePosts } from '@/lib/lore/loader';

export const dynamic = 'force-dynamic';

function stripLoreTagFromPost(post: ParsedPost): ParsedPost {
  const tags = post.metadata.tags ?? [];
  const filteredTags = tags.filter((tag) => tag.trim().toLowerCase() !== 'lore');

  if (filteredTags.length === tags.length) {
    return post;
  }

  return {
    ...post,
    metadata: {
      ...post.metadata,
      tags: filteredTags,
    },
  };
}

export default async function HomePage() {
  const allPosts = await loadAllPosts();
  const allLorePosts = await loadAllLorePosts();
  const [recentPosts, recentLorePosts, placeholderImageUrl] = await Promise.all([
    fingerprintPosts(getRecentPosts(allPosts, 3).map(stripLoreTagFromPost)),
    fingerprintPosts(allLorePosts.slice(0, 3).map(stripLoreTagFromPost)),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <HomePageClient
      recentPosts={recentPosts}
      recentLorePosts={recentLorePosts}
      placeholderImageUrl={placeholderImageUrl}
    />
  );
}
