/**
 * Client-side wrapper for BlogList component
 * Handles navigation to individual posts using Next.js router
 */

'use client';

import { useRouter } from 'next/navigation';
import { BlogList } from '@/components/blog/BlogList';
import type { ParsedPost } from '@/lib/blog/parser';

interface BlogPageClientProps {
  initialPosts: ParsedPost[];
  allPosts: ParsedPost[];
}

export function BlogPageClient({ initialPosts, allPosts }: BlogPageClientProps) {
  const router = useRouter();
  
  const handlePostClick = (post: ParsedPost) => {
    // Extract slug from filename (remove .md extension)
    const slug = post.filename.replace('.md', '');
    // Navigate to the post page
    router.push(`/blog/${slug}`);
  };
  
  return (
    <BlogList
      initialPosts={initialPosts}
      allPosts={allPosts}
      onPostClick={handlePostClick}
    />
  );
}
