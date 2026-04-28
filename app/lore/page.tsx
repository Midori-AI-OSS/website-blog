import { Box, Typography } from '@mui/joy';

import { loadLoreGameGroups } from '@/lib/lore/loader';

import { LoreListPageClient } from './LoreListPageClient';

export const dynamic = 'force-dynamic';

export default async function LorePage() {
  const gameGroups = await loadLoreGameGroups();

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '100%', md: '90%', lg: '80%' }, mx: 'auto', px: { xs: 0, sm: 4 }, py: { xs: 4, sm: 8 } }}>
      <Box sx={{ px: { xs: 1, sm: 0 } }}>
        <Typography level="h1" sx={{ mb: 4, fontSize: { xs: '2rem', md: '2.5rem' } }}>
          Lore
        </Typography>
        <Typography level="body-lg" sx={{ mb: 4, color: 'text.secondary' }}>
          Luna’s RP notes, story times, and campaign lore — collected over time.
        </Typography>
      </Box>
      <LoreListPageClient gameGroups={gameGroups} />
    </Box>
  );
}
