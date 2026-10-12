import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { lorePasswordGateTestPost } from '@/lib/content/test-posts';

import { LorePostPageClient } from '../../[slug]/LorePostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Lore password gate test',
  'Try the password form and see how a protected Lore story opens.',
);

export default async function LorePasswordGateTestPage() {
  const [post, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(lorePasswordGateTestPost),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Password-gated Lore story"
      description="This page demonstrates the password form that can protect a Lore story. The hint gives you a clue for opening this example."
      indexHref="/lore/test"
      indexLabel="Lore"
    >
      <LorePostPageClient post={post} placeholderImageUrl={placeholderImageUrl} />
    </TestPageShell>
  );
}
