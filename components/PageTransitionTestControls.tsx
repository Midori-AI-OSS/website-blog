'use client';

import { Box, Button, Stack, Typography } from '@mui/joy';
import Link from 'next/link';

export function PageTransitionTestControls({
  returnTo,
}: {
  returnTo: '/blog/test/markdown' | '/lore/test/markdown';
}) {
  const delayedHref = `/transition-test?delay=1500&returnTo=${encodeURIComponent(returnTo)}`;
  const fastHref = `/transition-test?delay=0&returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <Box sx={{ px: 2, py: 3 }}>
      <Typography level="h2" sx={{ mb: 1 }}>
        Try a page transition
      </Typography>
      <Typography level="body-md" sx={{ mb: 2 }}>
        Open either Markdown example, or compare a delayed destination with one that opens at once.
        The delayed and fast destinations return to the matching Markdown example.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button component={Link} href="/blog/test/markdown" sx={{ minHeight: 44 }}>
          Open Blog Markdown
        </Button>
        <Button component={Link} href="/lore/test/markdown" sx={{ minHeight: 44 }}>
          Open Lore Markdown
        </Button>
        <Button component={Link} href={delayedHref} prefetch={false} sx={{ minHeight: 44 }}>
          Delayed destination
        </Button>
        <Button component={Link} href={fastHref} prefetch={false} sx={{ minHeight: 44 }}>
          Fast destination
        </Button>
      </Stack>
    </Box>
  );
}
