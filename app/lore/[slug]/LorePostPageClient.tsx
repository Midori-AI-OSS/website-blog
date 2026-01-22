'use client';

import { useRouter } from 'next/navigation';

import { PostView } from '@/components/blog/PostView';
import type { ParsedPost } from '@/lib/blog/parser';

interface LorePostPageClientProps {
  post: ParsedPost;
}

export function LorePostPageClient({ post }: LorePostPageClientProps) {
  const router = useRouter();

  return (
    <PostView
      post={post}
      onClose={() => router.push('/lore')}
      backButtonLabel="Back to lore"
      backButtonAriaLabel="Back to lore list"
    />
  );
}
