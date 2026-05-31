/**
 * Client-side wrapper for PostView component
 * Handles back navigation using Next.js router
 */

'use client';

import { Box } from '@mui/joy';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { ParsedPost } from '@/lib/blog/parser';

const PostView = dynamic(() => import('@/components/blog/PostView').then((mod) => mod.PostView), {
  loading: () => <Box sx={{ minHeight: '100vh' }} />,
  ssr: true,
});

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
      key={post.filename}
      post={post}
      onClose={handleClose}
      isScheduledPreview={isScheduledPreview}
      scheduledPublishDate={scheduledPublishDate}
    />
  );
}
