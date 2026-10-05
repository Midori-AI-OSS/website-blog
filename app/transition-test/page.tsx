import { Box, Typography } from '@mui/joy';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TransitionTestPage({
  searchParams,
}: {
  searchParams: Promise<{ delay?: string; returnTo?: string }>;
}) {
  const query = await searchParams;
  const delay = query.delay === '0' ? 0 : 1500;
  const returnTo = query.returnTo === '/lore/test' ? '/lore/test' : '/blog/test';
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

  return (
    <Box sx={{ mx: 'auto', maxWidth: 720, px: 2, py: 6 }}>
      <Typography level="h1" sx={{ mb: 2 }}>
        Page transition test
      </Typography>
      <Link
        href={returnTo}
        style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, marginTop: 24 }}
      >
        Return to fixture
      </Link>
      <Typography level="body-lg">
        The destination finished loading. Use your browser&apos;s back button to try the transition
        again.
      </Typography>
    </Box>
  );
}
