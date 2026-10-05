'use client';

import { Box, Button, Stack, Typography } from '@mui/joy';
import Link from 'next/link';
import { usePageTransition } from './PageTransitionProvider';

export function PageTransitionTestControls({
  returnTo,
}: {
  returnTo: '/blog/test' | '/lore/test';
}) {
  const navigate = usePageTransition();
  return (
    <Box sx={{ px: 2, py: 3 }}>
      <Typography level="h2" sx={{ mb: 2 }}>
        Page loading fixtures
      </Typography>
      <Typography level="body-md" sx={{ mb: 2 }}>
        On desktop, let the radio artwork load, then switch between renderer fixtures. Its image
        should stay the same while the song stays the same, including through delayed navigation.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          component={Link}
          href={returnTo === '/blog/test' ? '/lore/test' : '/blog/test'}
          prefetch={false}
          sx={{ minHeight: 44 }}
        >
          Switch renderer fixture
        </Button>
        <Button
          component={Link}
          href={`/transition-test?delay=1500&returnTo=${returnTo}`}
          prefetch={false}
          sx={{ minHeight: 44 }}
        >
          Delayed page
        </Button>
        <Button
          onClick={() => navigate(`/transition-test?delay=0&returnTo=${returnTo}`)}
          sx={{ minHeight: 44 }}
        >
          Fast page
        </Button>
        <Button
          variant="outlined"
          sx={{ minHeight: 44 }}
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set(
              'loaderFixture',
              url.searchParams.get('loaderFixture') === '1' ? '2' : '1',
            );
            navigate(url.pathname + url.search, { scroll: false });
          }}
        >
          Change query
        </Button>
      </Stack>
    </Box>
  );
}
