/**
 * Client-side wrapper for PostView component
 * Handles back navigation using Next.js router
 */

'use client';

import { PostView } from '@/components/blog/PostView';
import { usePageTransition } from '@/components/PageTransitionProvider';
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
  const navigate = usePageTransition();

  const handleClose = () => {
    // Navigate back to the blog list
    navigate('/blog');
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
