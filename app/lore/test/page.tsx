import { TestPageIndex } from '@/components/test/TestPageIndex';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import { loreTestPages } from '@/lib/lore/test-pages';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Lore test pages',
  'Explore examples of the parts of Lore stories that readers see, from story layout and Lore tokens to language display and audio.',
);

export default function LoreTestIndexPage() {
  return (
    <TestPageIndex
      title="Lore test pages"
      description="Explore examples of the parts of Lore stories that readers see, from story layout and game ordering to Lore tokens, language display, and audio. Choose a topic below to open its own page."
      pages={loreTestPages}
    />
  );
}
