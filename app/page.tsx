import { loadAllPosts, getRecentPosts } from '@/lib/blog/loader';
import { loadAllLorePosts } from '@/lib/lore/loader';
import HomePageClient from '@/components/HomePageClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const allPosts = await loadAllPosts();
  const recentPosts = getRecentPosts(allPosts, 3);
  const allLorePosts = await loadAllLorePosts();
  const recentLorePosts = allLorePosts.slice(0, 3);

  return (
    <HomePageClient recentPosts={recentPosts} recentLorePosts={recentLorePosts} />
  );
}
