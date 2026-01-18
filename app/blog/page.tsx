/**
 * Blog List Page
 * 
 * Server component that loads all blog posts and displays them in a grid.
 * Uses Next.js App Router for static generation.
 */

import { loadAllPosts, paginatePosts } from '@/lib/blog/loader';
import { BlogPageClient } from './BlogPageClient';

export default async function BlogPage() {
  // Load all posts (this runs at build time with SSG)
  const allPosts = await loadAllPosts();
  const { posts: initialPosts } = paginatePosts(allPosts, 0, 10);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <BlogPageClient 
        initialPosts={initialPosts}
        allPosts={allPosts}
      />
    </div>
  );
}
