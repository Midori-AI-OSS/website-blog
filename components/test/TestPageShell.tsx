'use client';

import { Box, Button, Typography } from '@mui/joy';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface TestPageShellProps {
  title: string;
  description: string;
  indexHref: '/blog/test' | '/lore/test';
  indexLabel: 'Blog' | 'Lore';
  children: ReactNode;
}

export function TestPageShell({
  title,
  description,
  indexHref,
  indexLabel,
  children,
}: TestPageShellProps) {
  return (
    <Box component="main" sx={{ width: '100%', pb: 6 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 4 }, pt: 3, pb: 2 }}>
        <Button
          component={Link}
          href={indexHref}
          variant="plain"
          color="neutral"
          sx={{ minHeight: 44, mb: 2, px: 1 }}
        >
          Back to {indexLabel} test pages
        </Button>
        <Typography level="h1" sx={{ mb: 1, fontSize: { xs: '1.75rem', sm: '2.25rem' } }}>
          {title}
        </Typography>
        <Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 760 }}>
          {description}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}
