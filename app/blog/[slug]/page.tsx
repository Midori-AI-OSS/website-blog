/**
 * Individual Blog Post Page
 * 
 * Server component that displays a single blog post.
 * Uses Next.js App Router with dynamic routes and static generation.
 */

import { loadAllPosts, getPostBySlug } from '@/lib/blog/loader';
import { notFound } from 'next/navigation';
import { PostPageClient } from './PostPageClient';

export const dynamic = 'force-dynamic';

/**
 * Generate static params for all posts at build time
 */
export async function generateStaticParams() {
  const posts = await loadAllPosts();
  return posts.map(post => ({
    slug: post.filename.replace('.md', '')
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const allPosts = await loadAllPosts();
  const post = getPostBySlug(allPosts, slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  // Extract date logic (similar to PostView)
  let date: Date = new Date();

  // Try to extract from filename first
  const match = post.filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) {
    date = new Date(match[1]);
  } else if (post.metadata.date !== undefined) {
    // Fall back to metadata.date if it exists
    date = new Date(post.metadata.date);
  }

  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    title: `Midori AI Blog - ${formattedDate}`,
    description: post.metadata.summary || post.metadata.title,
  };
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
