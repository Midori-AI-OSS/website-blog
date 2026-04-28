'use client';

import { Stack } from '@mui/joy';

import { PostView } from '@/components/blog/PostView';
import type { ParsedPost } from '@/lib/blog/parser';

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
          onClose={() => {}}
        />
      ))}
    </Stack>
  );
}
