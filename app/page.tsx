import { loadAllPosts, getRecentPosts } from '@/lib/blog/loader';
import { loadAllLorePosts } from '@/lib/lore/loader';
import HomePageClient from '@/components/HomePageClient';
import type { ParsedPost } from '@/lib/blog/parser';

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
  const recentPosts = getRecentPosts(allPosts, 3).map(stripLoreTagFromPost);
  const allLorePosts = await loadAllLorePosts();
  const recentLorePosts = allLorePosts.slice(0, 3).map(stripLoreTagFromPost);

  return (
    <HomePageClient recentPosts={recentPosts} recentLorePosts={recentLorePosts} />
  );
}
