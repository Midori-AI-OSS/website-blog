import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { loreTtsTestPost } from '@/lib/content/test-posts';

import { LorePostPageClient } from '../../[slug]/LorePostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Lore text-to-speech test',
  'Generate and play a Lore reading with normal speech, dialogue, and fictional-language audio.',
);

export default async function LoreTtsTestPage() {
  const [post, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(loreTtsTestPost),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Lore text-to-speech audio"
      description="Use the audio controls to generate and play this Lore reading. It includes normal narration, dialogue, and Celestial and Abyssal speech and sound examples."
      indexHref="/lore/test"
      indexLabel="Lore"
    >
      <LorePostPageClient post={post} placeholderImageUrl={placeholderImageUrl} />
    </TestPageShell>
  );
}
