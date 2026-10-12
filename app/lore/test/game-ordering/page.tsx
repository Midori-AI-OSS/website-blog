import { Box } from '@mui/joy';
import { TestPageShell } from '@/components/test/TestPageShell';
import type { ParsedPost } from '@/lib/blog/parser';
import {
  fingerprintLoreGameGroups,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';
import type { LoreGameGroup } from '@/lib/lore/loader';

import { LoreListPageClient } from '../../LoreListPageClient';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Lore game ordering test',
  'Explore how weighted, dated, and empty games appear in the Lore list.',
);

function createGameOrderingTestGroup(
  slug: string,
  title: string,
  date: string | undefined,
  displayWeight?: number,
): LoreGameGroup {
  const posts: ParsedPost[] = date
    ? [
        {
          filename: `ordering-test-${slug}.md`,
          content: `Ordering fixture for ${title}.`,
          rawMarkdown: `Ordering fixture for ${title}.`,
          metadata: {
            title: `${title} Ordering Fixture`,
            summary: `A short example that places ${title} in the Lore game list.`,
            tags: ['lore', slug, 'test-fixture', 'riley'],
            cover_image: '/lore/placeholder.png',
            date,
            author: 'Website Test Fixture',
            game: slug,
            story_order: 1,
          },
        },
      ]
    : [];

  return {
    game: {
      slug,
      title,
      summary: 'Example game used to demonstrate Lore ordering.',
      displayWeight,
      coverImage: '/lore/placeholder.png',
      povsEnabled: false,
      fullStoryPov: '',
    },
    posts,
    characters: posts.length > 0 ? ['riley'] : [],
  };
}

const loreGameOrderingTestGroups: LoreGameGroup[] = [
  createGameOrderingTestGroup('real-moments', 'Real Moments', '2026-01-01', 300),
  createGameOrderingTestGroup('side-moments', 'Side Moments', '2026-03-31', 200),
  createGameOrderingTestGroup('archive-moments', 'Archive Moments', '2026-04-01', 100),
  createGameOrderingTestGroup('new-lore-game', 'New Lore Game', '2026-05-01'),
  createGameOrderingTestGroup('older-lore-game', 'Older Lore Game', '2026-04-30'),
  createGameOrderingTestGroup('empty-lore-game', 'Empty Lore Game', undefined),
];

export default async function LoreGameOrderingTestPage() {
  const [groups, placeholderImageUrl] = await Promise.all([
    fingerprintLoreGameGroups(loreGameOrderingTestGroups),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Lore game ordering"
      description="This page demonstrates how weighted games, dated games, and a game without stories are arranged in the Lore list."
      indexHref="/lore/test"
      indexLabel="Lore"
    >
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 4 } }}>
        <LoreListPageClient gameGroups={groups} placeholderImageUrl={placeholderImageUrl} />
      </Box>
    </TestPageShell>
  );
}
