import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { blogRendererTestPost } from '@/lib/content/test-posts';

import { PostPageClient } from '../../[slug]/PostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Blog Markdown test',
  'See how a Blog post presents common Markdown and post styling.',
);

export default async function BlogMarkdownTestPage() {
  const [post, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(blogRendererTestPost),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Blog Markdown and post layout"
      description="This page demonstrates how common Markdown looks inside a Blog post, including headings, lists, links, images, tables, dialogue, and text styling."
      indexHref="/blog/test"
      indexLabel="Blog"
    >
      <PostPageClient post={post} placeholderImageUrl={placeholderImageUrl} />
    </TestPageShell>
  );
}
