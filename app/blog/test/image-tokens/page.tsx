import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { blogImageTokenTestPost } from '@/lib/content/test-posts';

import { PostPageClient } from '../../[slug]/PostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Blog image-token test',
  'See Blog image tokens load Lore images and shared owner-folder paths, with a placeholder for a missing image.',
);

export default async function BlogImageTokensTestPage() {
  const [post, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(blogImageTokenTestPost),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Blog image tokens"
      description="This page shows a Blog post using an existing Lore image, a shared owner-folder path, and the placeholder when an image is missing."
      indexHref="/blog/test"
      indexLabel="Blog"
    >
      <PostPageClient post={post} placeholderImageUrl={placeholderImageUrl} />
    </TestPageShell>
  );
}
