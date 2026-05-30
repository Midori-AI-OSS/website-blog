'use client';

import { Box, Stack } from '@mui/joy';
import dynamic from 'next/dynamic';
import type { ParsedPost } from '@/lib/blog/parser';

const PostView = dynamic(() => import('@/components/blog/PostView').then((mod) => mod.PostView), {
  loading: () => <Box sx={{ minHeight: '100vh' }} />,
  ssr: true,
});

interface FullStoryClientProps {
  posts: ParsedPost[];
}

export function FullStoryClient({ posts }: FullStoryClientProps) {
  return (
    <Stack spacing={0}>
      {posts.map((post) => (
        <PostView
          key={post.filename}
          post={post}
          postType="lore"
          hideBackButton
          disableDynamicBackdrop
          onClose={() => {}}
        />
      ))}
    </Stack>
  );
}
