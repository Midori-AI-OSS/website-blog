import { TestPageShell } from '@/components/test/TestPageShell';
import {
  fingerprintPostImages,
  fingerprintSpeciesCareCards,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { loreTokenTestPost } from '@/lib/content/test-posts';
import { loadSpeciesCareCardsForMarkdown } from '@/lib/species-care/loader';

import { LorePostPageClient } from '../../[slug]/LorePostPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Lore token test',
  'View Lore and shared owner-folder images plus species care cards inside a story.',
);

export default async function LoreTokensTestPage() {
  const [post, loadedSpeciesCareCards, placeholderImageUrl] = await Promise.all([
    fingerprintPostImages(loreTokenTestPost),
    loadSpeciesCareCardsForMarkdown(loreTokenTestPost.content),
    getFingerprintedPlaceholderImageUrl(),
  ]);
  const speciesCareCards = await fingerprintSpeciesCareCards(loadedSpeciesCareCards);

  return (
    <TestPageShell
      title="Lore image and species card tokens"
      description="This page demonstrates Lore and shared owner-folder image tokens and species card embeds inside a Lore story."
      indexHref="/lore/test"
      indexLabel="Lore"
    >
      <LorePostPageClient
        post={post}
        speciesCareCards={speciesCareCards}
        placeholderImageUrl={placeholderImageUrl}
      />
    </TestPageShell>
  );
}
