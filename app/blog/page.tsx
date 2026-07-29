/**
 * Blog Archive Page
 *
 * Server component that loads all blog posts, groups them into chronological
 * archive periods with month-level merging, and displays them in per-period
 * sections with independent filtering and pagination.
 */

import { Box, Typography } from '@mui/joy';
import { groupPostsIntoArchivePeriods } from '@/lib/blog/archive';
import { loadAllPosts } from '@/lib/blog/loader';
import { BlogArchiveClient } from './BlogArchiveClient';

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const allPosts = await loadAllPosts();
  const periods = groupPostsIntoArchivePeriods(allPosts);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: '100%', md: '90%', lg: '80%' },
        mx: 'auto',
        px: { xs: 0, sm: 4 },
        py: { xs: 4, sm: 8 },
      }}
    >
      <Box sx={{ px: { xs: 1, sm: 0 } }}>
        <Typography level="h1" sx={{ mb: 4, fontSize: { xs: '2rem', md: '2.5rem' } }}>
          Blog
        </Typography>
        <Typography level="body-lg" sx={{ mb: 4, color: 'text.secondary' }}>
          Engineering updates, project notes, and what we've learned while building.
        </Typography>
      </Box>
      <BlogArchiveClient periods={periods} />
    </Box>
  );
}
