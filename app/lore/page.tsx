import { Box, Typography } from '@mui/joy';

import { loadAllLorePosts, paginateLorePosts } from '@/lib/lore/loader';

import { LoreListPageClient } from './LoreListPageClient';

export const dynamic = 'force-dynamic';

export default async function LorePage() {
  const allPosts = await loadAllLorePosts();
  const { posts: initialPosts } = paginateLorePosts(allPosts, 0, 10);

  return (
    <Box sx={{ width: '100%', maxWidth: '80%', mx: 'auto', px: { xs: 2, sm: 4 }, py: 8 }}>
      <Typography level="h1" sx={{ mb: 4, fontSize: { xs: '2rem', md: '2.5rem' } }}>
        Lore
      </Typography>
      <Typography level="body-lg" sx={{ mb: 4, color: 'text.secondary' }}>
        Luna’s DnD notes, story times, and campaign lore — collected over time.
      </Typography>
      <LoreListPageClient initialPosts={initialPosts} allPosts={allPosts} />
    </Box>
  );
}
