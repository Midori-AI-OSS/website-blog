import { loadAllPosts, getRecentPosts } from '@/lib/blog/loader';
import HomePageClient from '@/components/HomePageClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const allPosts = await loadAllPosts();
  const recentPosts = getRecentPosts(allPosts, 3);

  return (
    <HomePageClient recentPosts={recentPosts} />
  );
}
