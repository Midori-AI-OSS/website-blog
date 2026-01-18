/**
 * Individual Blog Post Page
 * 
 * Server component that displays a single blog post.
 * Uses Next.js App Router with dynamic routes and static generation.
 */

import { loadAllPosts, getPostBySlug } from '@/lib/blog/loader';
import { notFound } from 'next/navigation';
import { PostPageClient } from './PostPageClient';

/**
 * Generate static params for all posts at build time
 */
export async function generateStaticParams() {
  const posts = await loadAllPosts();
  return posts.map(post => ({
    slug: post.filename.replace('.md', '')
  }));
}

/**
 * Individual post page component
 */
export default async function PostPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  // Await params as per Next.js 15 requirements
  const { slug } = await params;
  
  // Load all posts and find the requested one
  const allPosts = await loadAllPosts();
  const post = getPostBySlug(allPosts, slug);
  
  // Handle 404 for non-existent posts
  if (!post) {
    notFound();
  }
  
  return (
    <PostPageClient post={post} />
  );
}
