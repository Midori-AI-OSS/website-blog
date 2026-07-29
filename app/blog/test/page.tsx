import { Box, Divider, Stack, Typography } from '@mui/joy';
import type { Metadata } from 'next';

import { groupPostsIntoArchivePeriods } from '@/lib/blog/archive';
import type { ParsedPost } from '@/lib/blog/parser';
import { blogRendererTestPost } from '@/lib/content/test-posts';

import { PostPageClient } from '../[slug]/PostPageClient';
import { BlogArchiveClient } from '../BlogArchiveClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog Renderer Test',
  description: 'Hidden blog renderer and archive fixture page.',
};

function makeArchiveTestPost(
  filename: string,
  title: string,
  tags: string[],
  summary = 'Archive fixture entry for hidden blog test coverage.',
): ParsedPost {
  return {
    filename,
    metadata: {
      title,
      summary,
      tags,
      date: filename.replace(/\.md$/i, ''),
      author: 'Midori AI Test Fixture',
      cover_image: '/blog/placeholder.png',
    },
    content: `# ${title}\n\nArchive fixture for ${filename}.`,
    rawMarkdown: `# ${title}\n\nArchive fixture for ${filename}.`,
  };
}

const archiveFixturePeriods = groupPostsIntoArchivePeriods([
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

export default function BlogRendererTestPage() {
  return (
    <Stack spacing={6}>
      <Box sx={{ px: { xs: 1, sm: 0 }, pt: { xs: 3, sm: 4 } }}>
        <Typography level="h1" sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' }, mb: 1 }}>
          Hidden Blog Archive Fixture
        </Typography>
        <Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 720 }}>
          This page intentionally exercises archive grouping, tag filtering, pagination, artwork
          fallback, and lazy section mounting without linking the fixture from normal blog
          navigation.
        </Typography>
      </Box>

      <BlogArchiveClient periods={archiveFixturePeriods} />

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      <Box>
        <Typography level="h2" sx={{ px: { xs: 1, sm: 0 }, mb: 2 }}>
          Hidden Blog Post Renderer Fixture
        </Typography>
        <PostPageClient post={blogRendererTestPost} />
      </Box>
    </Stack>
  );
}
