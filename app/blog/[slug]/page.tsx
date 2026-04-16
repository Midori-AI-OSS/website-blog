/**
 * Individual Blog Post Page
 * 
 * Server component that displays a single blog post.
 * Uses Next.js App Router with dynamic routes and static generation.
 */

import { loadAllPosts, getPostBySlug } from '@/lib/blog/loader';
import { extractIsoDateFromBlogFilename, formatLongDate, getPublishState } from '@/lib/content/publish';
import { notFound } from 'next/navigation';
import { PostPageClient } from './PostPageClient';

export const dynamic = 'force-dynamic';

/**
 * Generate static params for all posts at build time
 */
export async function generateStaticParams() {
  const posts = await loadAllPosts(undefined, { includeScheduled: true });
  return posts.map(post => ({
    slug: post.filename.replace('.md', '')
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const allPosts = await loadAllPosts(undefined, { includeScheduled: true });
  const post = getPostBySlug(allPosts, slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const publishState = getPublishState(extractIsoDateFromBlogFilename(post.filename));
  const formattedDate = formatLongDate(publishState.publishDate) ?? 'Unknown Date';

  return {
    title: publishState.isScheduled
      ? `Midori AI Blog - Scheduled for ${formattedDate}`
      : `Midori AI Blog - ${formattedDate}`,
    description: publishState.isScheduled
      ? `This post is scheduled for ${formattedDate} in Portland time.`
      : post.metadata.summary || post.metadata.title,
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
  const allPosts = await loadAllPosts(undefined, { includeScheduled: true });
  const post = getPostBySlug(allPosts, slug);

  // Handle 404 for non-existent posts
  if (!post) {
    notFound();
  }

  const publishState = getPublishState(extractIsoDateFromBlogFilename(post.filename));

  return (
    <PostPageClient
      post={post}
      isScheduledPreview={publishState.isScheduled}
      scheduledPublishDate={publishState.publishDate ?? undefined}
    />
  );
}
