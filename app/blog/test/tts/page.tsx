import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { blogTtsTestPost } from '@/lib/content/test-posts';

import { PostPageClient } from '../../[slug]/PostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Blog text-to-speech test',
  'Generate and play a Blog post reading with normal speech, dialogue, and fictional-language audio.',
);

export default async function BlogTtsTestPage() {
  const [post, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(blogTtsTestPost),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Blog text-to-speech audio"
      description="Use the audio controls to generate and play this Blog reading. It includes normal narration, dialogue, and Celestial and Abyssal speech and sound examples."
      indexHref="/blog/test"
      indexLabel="Blog"
    >
      <PostPageClient post={post} placeholderImageUrl={placeholderImageUrl} />
    </TestPageShell>
  );
}
