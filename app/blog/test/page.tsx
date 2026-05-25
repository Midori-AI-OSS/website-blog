import type { Metadata } from 'next';

import { blogRendererTestPost } from '@/lib/content/test-posts';

import { PostPageClient } from '../[slug]/PostPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog Renderer Test',
  description: 'Hidden blog renderer fixture page.',
};

export default function BlogRendererTestPage() {
  return <PostPageClient post={blogRendererTestPost} />;
}
