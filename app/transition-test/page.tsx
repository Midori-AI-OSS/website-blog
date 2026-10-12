import { Box, Typography } from '@mui/joy';
import Link from 'next/link';
import { PageTransitionTestControls } from '@/components/PageTransitionTestControls';
import { TestPageShell } from '@/components/test/TestPageShell';
import { createTestPageMetadata } from '@/lib/content/test-page-metadata';

export const dynamic = 'force-dynamic';

export const metadata = createTestPageMetadata(
  'Page transition test',
  'Compare fast and delayed transitions between the Blog and Lore Markdown test pages.',
);

type MarkdownRoute = '/blog/test/markdown' | '/lore/test/markdown';

export default async function TransitionTestPage({
  searchParams,
}: {
  searchParams: Promise<{ delay?: string; returnTo?: string }>;
}) {
  const query = await searchParams;
  const returnTo: MarkdownRoute =
    query.returnTo === '/lore/test/markdown' ? '/lore/test/markdown' : '/blog/test/markdown';
  const isLore = returnTo === '/lore/test/markdown';
  const indexHref = isLore ? '/lore/test' : '/blog/test';
  const indexLabel = isLore ? 'Lore' : 'Blog';
  const destination = query.delay === '1500' || query.delay === '0';

  if (query.delay === '1500') await new Promise((resolve) => setTimeout(resolve, 1500));

  return (
    <TestPageShell
      title="Page transition test"
      description="This page demonstrates how a page change feels when its destination opens quickly or takes a moment to load."
      indexHref={indexHref}
      indexLabel={indexLabel}
    >
      {destination ? (
        <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, sm: 4 }, py: 3 }}>
          <Typography level="h2" sx={{ mb: 1 }}>
            The destination finished loading.
          </Typography>
          <Typography level="body-md" sx={{ mb: 2, color: 'text.secondary' }}>
            Use the browser&apos;s back button to try this transition again, or return to the
            matching
            {` ${indexLabel} Markdown example`}.
          </Typography>
          <Link
            href={returnTo}
            style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, marginTop: 8 }}
          >
            Return to {indexLabel} Markdown test
          </Link>
        </Box>
      ) : (
        <PageTransitionTestControls returnTo={returnTo} />
      )}
    </TestPageShell>
  );
}
