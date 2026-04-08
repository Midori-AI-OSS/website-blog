/**
 * Blog List Page
 * 
 * Server component that loads all blog posts and displays them in a grid.
 * Uses Next.js App Router for static generation.
 */

import { loadAllPosts, paginatePosts } from '@/lib/blog/loader';
import { BlogPageClient } from './BlogPageClient';
import { Box, Typography } from '@mui/joy';

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  // Load all posts (this runs at build time with SSG)
  const allPosts = await loadAllPosts();
  const { posts: initialPosts } = paginatePosts(allPosts, 0, 10);

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '100%', md: '90%', lg: '80%' }, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 4, sm: 8 } }}>
      <Typography level="h1" sx={{ mb: 4, fontSize: { xs: '2rem', md: '2.5rem' } }}>
        Blog
      </Typography>
      <Typography level="body-lg" sx={{ mb: 4, color: 'text.secondary' }}>
        Engineering updates, project notes, and what we’ve learned while building.
      </Typography>
      <BlogPageClient
        initialPosts={initialPosts}
        allPosts={allPosts}
      />
    </Box>
  );
}
