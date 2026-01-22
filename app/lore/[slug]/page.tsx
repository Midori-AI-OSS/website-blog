/**
 * Individual Lore Entry Page
 *
 * Reuses the same PostView used for blog posts.
 */

import { notFound } from 'next/navigation';

import { getLorePostBySlug, loadAllLorePosts } from '@/lib/lore/loader';

import { LorePostPageClient } from './LorePostPageClient';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const posts = await loadAllLorePosts();
  return posts.map(post => ({
    slug: post.filename.replace('.md', ''),
  }));
}

export default async function LoreEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const allPosts = await loadAllLorePosts();
  const post = getLorePostBySlug(allPosts, slug);

  if (!post) {
    notFound();
  }

  return <LorePostPageClient post={post} />;
}
