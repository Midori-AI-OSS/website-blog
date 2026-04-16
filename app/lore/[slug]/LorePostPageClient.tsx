'use client';

import { useRouter } from 'next/navigation';

import { PostView } from '@/components/blog/PostView';
import type { ParsedPost } from '@/lib/blog/parser';

interface LorePostPageClientProps {
  post: ParsedPost;
  isScheduledPreview?: boolean;
  scheduledPublishDate?: string;
}

export function LorePostPageClient({
  post,
  isScheduledPreview = false,
  scheduledPublishDate,
}: LorePostPageClientProps) {
  const router = useRouter();

  return (
    <PostView
      post={post}
      onClose={() => router.push('/lore')}
      backButtonLabel="Back to lore"
      backButtonAriaLabel="Back to lore list"
      postType="lore"
      isScheduledPreview={isScheduledPreview}
      scheduledPublishDate={scheduledPublishDate}
    />
  );
}
