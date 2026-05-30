import HomePageClient from '@/components/HomePageClient';
import { loadRecentPosts } from '@/lib/blog/loader';
import type { ParsedPost } from '@/lib/blog/parser';
import { loadRecentLorePosts } from '@/lib/lore/loader';

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
  const [recentPosts, recentLorePosts] = await Promise.all([
    loadRecentPosts(3),
    loadRecentLorePosts(3),
  ]);

  return (
    <HomePageClient
      recentPosts={recentPosts.map(stripLoreTagFromPost)}
      recentLorePosts={recentLorePosts.map(stripLoreTagFromPost)}
    />
  );
}
