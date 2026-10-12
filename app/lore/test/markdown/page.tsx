import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { loreMarkdownTestPost } from '@/lib/content/test-posts';

import { LorePostPageClient } from '../../[slug]/LorePostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Lore Markdown test',
  'See how a Lore story presents its metadata, prose, dialogue, and standard Markdown.',
);

export default async function LoreMarkdownTestPage() {
  const [post, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(loreMarkdownTestPost),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Lore Markdown and story layout"
      description="This page demonstrates how standard Markdown, dialogue, and story details appear inside a Lore post. The story is open to read."
      indexHref="/lore/test"
      indexLabel="Lore"
    >
      <LorePostPageClient post={post} placeholderImageUrl={placeholderImageUrl} />
    </TestPageShell>
  );
}
