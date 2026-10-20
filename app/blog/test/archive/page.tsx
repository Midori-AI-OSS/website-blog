import { Box } from '@mui/joy';
import type { Metadata } from 'next';
import { TestPageShell } from '@/components/test/TestPageShell';
import { groupPostsIntoArchivePeriods } from '@/lib/blog/archive';
import type { ParsedPost } from '@/lib/blog/parser';
import {
  fingerprintArchivePeriods,
  fingerprintPosts,
  getFingerprintedPlaceholderImageUrl,
} from '@/lib/content/imageFingerprint.server';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';

import { BlogArchiveClient } from '../../BlogArchiveClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = createTestPageMetadata(
  'Blog archive test',
  'Explore immediate archive sections, jump navigation, deferred artwork, filters, and page controls.',
);

function makeArchiveTestPost(
  filename: string,
  title: string,
  tags: string[],
  summary = 'Archive fixture entry for Blog test coverage.',
): ParsedPost {
  return {
    filename,
    metadata: {
      title,
      summary,
      tags,
      date: filename.replace(/\.md$/i, ''),
      author: 'Website Test Fixture',
      cover_image: '/blog/placeholder.png',
    },
    content: `# ${title}\n\nArchive fixture for ${filename}.`,
    rawMarkdown: `# ${title}\n\nArchive fixture for ${filename}.`,
  };
}

const archiveFixturePeriods = groupPostsIntoArchivePeriods([
  ...Array.from({ length: 5 }, (_, index) =>
    makeArchiveTestPost(`2026-08-${20 - index}.md`, `Archive Fixture Aug ${index + 1}`, [
      'release',
    ]),
  ),
  ...[
    { month: '07', count: 4 },
    { month: '06', count: 2 },
    { month: '04', count: 3, start: 26 },
    { month: '03', count: 2 },
  ].flatMap(({ month, count, start = 16 }) =>
    Array.from({ length: count }, (_, index) =>
      makeArchiveTestPost(
        `2026-${month}-${String(start - index).padStart(2, '0')}.md`,
        `Archive Fixture ${month} browsing ${index + 1}`,
        ['notes'],
      ),
    ),
  ),
  makeArchiveTestPost('2026-07-28.md', 'Archive Fixture Jul 1', ['release', 'ui']),
  makeArchiveTestPost('2026-06-24.md', 'Archive Fixture Jun 1', ['release', 'notes']),
  makeArchiveTestPost('2026-06-18.md', 'Archive Fixture Jun 2', ['notes']),
  makeArchiveTestPost('2026-06-09.md', 'Archive Fixture Jun 3', ['ui']),
  makeArchiveTestPost('2026-05-31.md', 'Archive Fixture May 1', ['archive', 'ui']),
  makeArchiveTestPost('2026-05-30.md', 'Archive Fixture May 2', ['archive']),
  makeArchiveTestPost('2026-05-29.md', 'Archive Fixture May 3', ['archive']),
  makeArchiveTestPost('2026-05-28.md', 'Archive Fixture May 4', ['archive']),
  makeArchiveTestPost('2026-05-27.md', 'Archive Fixture May 5', ['archive']),
  makeArchiveTestPost('2026-05-26.md', 'Archive Fixture May 6', ['archive']),
  makeArchiveTestPost('2026-05-25.md', 'Archive Fixture May 7', ['archive']),
  makeArchiveTestPost('2026-05-24.md', 'Archive Fixture May 8', ['archive']),
  makeArchiveTestPost('2026-05-23.md', 'Archive Fixture May 9', ['archive']),
  makeArchiveTestPost('2026-05-22.md', 'Archive Fixture May 10', ['archive']),
  makeArchiveTestPost('2026-05-21.md', 'Archive Fixture May 11', ['archive']),
  makeArchiveTestPost('2026-05-20.md', 'Archive Fixture May 12', ['archive']),
  makeArchiveTestPost('2026-04-15.md', 'Archive Fixture Apr 1', ['fallback']),
  makeArchiveTestPost('2026-04-03.md', 'Archive Fixture Apr 2', ['fallback', 'notes']),
  makeArchiveTestPost('2026-03-20.md', 'Archive Fixture Mar 1', ['fallback']),
  makeArchiveTestPost('2026-03-12.md', 'Archive Fixture Mar 2', ['notes']),
  makeArchiveTestPost('2026-03-02.md', 'Archive Fixture Mar 3', ['fallback']),
  makeArchiveTestPost('0005-02-15.md', 'Archive Fixture Ancient Feb 1', ['placeholder']),
  makeArchiveTestPost('0005-02-08.md', 'Archive Fixture Ancient Feb 2', ['placeholder']),
  makeArchiveTestPost('0005-01-20.md', 'Archive Fixture Ancient Jan 1', ['placeholder']),
  makeArchiveTestPost('0005-01-13.md', 'Archive Fixture Ancient Jan 2', ['placeholder']),
  makeArchiveTestPost('0005-01-05.md', 'Archive Fixture Ancient Jan 3', ['placeholder']),
]);

export default async function BlogArchiveTestPage() {
  const [periods, placeholderImageUrl] = await Promise.all([
    fingerprintArchivePeriods(
      await Promise.all(
        archiveFixturePeriods.map(async (period) => ({
          ...period,
          posts: await fingerprintPosts(period.posts),
        })),
      ),
    ),
    getFingerprintedPlaceholderImageUrl(),
  ]);

  return (
    <TestPageShell
      title="Blog archive browsing"
      description="Every archive section is available immediately. Jump between months without scrolling first: artwork loads near the viewport while its space stays reserved. Visible desktop jump pills load their artwork immediately. Try tag filters and pagination, and compare landscape month covers with the portrait placeholder in the oldest section."
      indexHref="/blog/test"
      indexLabel="Blog"
    >
      <Box sx={{ px: { xs: 1, sm: 4 } }}>
        <BlogArchiveClient periods={periods} placeholderImageUrl={placeholderImageUrl} />
      </Box>
    </TestPageShell>
  );
}
