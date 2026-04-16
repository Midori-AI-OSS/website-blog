/**
 * Client-side wrapper for PostView component
 * Handles back navigation using Next.js router
 */

'use client';

import { useRouter } from 'next/navigation';
import { PostView } from '@/components/blog/PostView';
import type { ParsedPost } from '@/lib/blog/parser';

interface PostPageClientProps {
  post: ParsedPost;
  isScheduledPreview?: boolean;
  scheduledPublishDate?: string;
}

export function PostPageClient({
  post,
  isScheduledPreview = false,
  scheduledPublishDate,
}: PostPageClientProps) {
  const router = useRouter();
  
  const handleClose = () => {
    // Navigate back to the blog list
    router.push('/blog');
  };
  
  return (
    <PostView
      post={post}
      onClose={handleClose}
      isScheduledPreview={isScheduledPreview}
      scheduledPublishDate={scheduledPublishDate}
    />
  );
}
