import { Box, Typography } from '@mui/joy';

export const dynamic = 'force-dynamic';

export default async function TransitionTestPage() {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return (
    <Box sx={{ mx: 'auto', maxWidth: 720, px: 2, py: 6 }}>
      <Typography level="h1" sx={{ mb: 2 }}>
        Page transition test
      </Typography>
      <Typography level="body-lg">
        The destination finished loading. Use your browser&apos;s back button to try the transition
        again.
      </Typography>
    </Box>
  );
}
