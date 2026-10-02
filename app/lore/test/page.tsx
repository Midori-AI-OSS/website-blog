import { Box, Typography } from '@mui/joy';
import type { Metadata } from 'next';

import type { ParsedPost } from '@/lib/blog/parser';
import { loreRendererTestPost } from '@/lib/content/test-posts';
import type { LoreGameGroup } from '@/lib/lore/loader';
import { loadSpeciesCareCardsForMarkdown } from '@/lib/species-care/loader';

import { LorePostPageClient } from '../[slug]/LorePostPageClient';
import { LoreListPageClient } from '../LoreListPageClient';

const passwordProtectedLoreRendererTestPost = {
  ...loreRendererTestPost,
  metadata: {
    ...loreRendererTestPost.metadata,
    password: 'lore-test',
  },
};

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
            summary: `A hidden fixture demonstrating the position of ${title}.`,
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
      summary: 'Hidden fixture for checking lore game ordering.',
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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lore Renderer Test',
  description: 'Hidden lore renderer fixture page.',
};

export default async function LoreRendererTestPage() {
  const speciesCareCards = await loadSpeciesCareCardsForMarkdown(loreRendererTestPost.content);

  return (
    <>
      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 1, sm: 4 }, py: 4 }}>
        <Typography level="h1" sx={{ mb: 1 }}>
          Lore Game Ordering Test
        </Typography>
        <Typography level="body-md" sx={{ mb: 3, color: 'text.secondary' }}>
          The three weighted games stay in priority order despite their post dates. Unweighted games
          follow by recent post date, with an empty game last.
        </Typography>
        <LoreListPageClient gameGroups={loreGameOrderingTestGroups} />
      </Box>
      <LorePostPageClient
        post={passwordProtectedLoreRendererTestPost}
        speciesCareCards={speciesCareCards}
      />
    </>
  );
}
