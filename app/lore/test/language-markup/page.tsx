import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { loreLanguageMarkupTestPost } from '@/lib/content/test-posts';

import { LorePostPageClient } from '../../[slug]/LorePostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Lore language markup test',
  'View Celestial and Abyssal text and their hover reveal behavior in a Lore story.',
);

export default async function LoreLanguageMarkupTestPage() {
  const [post, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(loreLanguageMarkupTestPost),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Lore fictional language display"
      description="This page demonstrates how Celestial and Abyssal text appears in a Lore story. Hover over the marked phrases to see the readable form appear."
      indexHref="/lore/test"
      indexLabel="Lore"
    >
      <LorePostPageClient post={post} placeholderImageUrl={placeholderImageUrl} />
    </TestPageShell>
  );
}
