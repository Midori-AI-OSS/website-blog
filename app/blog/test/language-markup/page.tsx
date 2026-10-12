import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { blogLanguageMarkupTestPost } from '@/lib/content/test-posts';

import { PostPageClient } from '../../[slug]/PostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Blog language markup test',
  'View Celestial and Abyssal text and their hover reveal behavior in a Blog post.',
);

export default async function BlogLanguageMarkupTestPage() {
  const [post, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(blogLanguageMarkupTestPost),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Blog fictional language display"
      description="This page demonstrates how Celestial and Abyssal text appears in a Blog post. Hover over the marked phrases to see the readable form appear."
      indexHref="/blog/test"
      indexLabel="Blog"
    >
      <PostPageClient post={post} placeholderImageUrl={placeholderImageUrl} />
    </TestPageShell>
  );
}
