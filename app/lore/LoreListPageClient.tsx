'use client';

import { useRouter } from 'next/navigation';

import { BlogList } from '@/components/blog/BlogList';
import type { ParsedPost } from '@/lib/blog/parser';

interface LoreListPageClientProps {
  initialPosts: ParsedPost[];
  allPosts: ParsedPost[];
}

export function LoreListPageClient({ initialPosts, allPosts }: LoreListPageClientProps) {
  const router = useRouter();

  const handlePostClick = (post: ParsedPost) => {
    const slug = post.filename.replace('.md', '');
    router.push(`/lore/${slug}`);
  };

  return (
    <BlogList
      initialPosts={initialPosts}
      allPosts={allPosts}
      onPostClick={handlePostClick}
    />
  );
}
