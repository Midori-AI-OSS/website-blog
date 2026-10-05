'use client';

import { Stack } from '@mui/joy';

import { PostView } from '@/components/blog/PostView';
import type { ParsedPost } from '@/lib/blog/parser';

interface FullStoryClientProps {
  posts: ParsedPost[];
  placeholderImageUrl?: string;
}

export function FullStoryClient({ posts, placeholderImageUrl }: FullStoryClientProps) {
  return (
    <Stack spacing={0}>
      {posts.map((post) => (
        <PostView
          key={post.filename}
          post={post}
          placeholderImageUrl={placeholderImageUrl}
          postType="lore"
          hideBackButton
          disableDynamicBackdrop
          onClose={() => {}}
        />
      ))}
    </Stack>
  );
}
