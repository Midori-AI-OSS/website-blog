import type { Metadata } from 'next';

import { loreRendererTestPost } from '@/lib/content/test-posts';
import { loadSpeciesCareCardsForMarkdown } from '@/lib/species-care/loader';

import { LorePostPageClient } from '../[slug]/LorePostPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lore Renderer Test',
  description: 'Hidden lore renderer fixture page.',
};

export default async function LoreRendererTestPage() {
  const speciesCareCards = await loadSpeciesCareCardsForMarkdown(loreRendererTestPost.content);

  return <LorePostPageClient post={loreRendererTestPost} speciesCareCards={speciesCareCards} />;
}
