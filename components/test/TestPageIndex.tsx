'use client';

import { Box, Button, Stack, Typography } from '@mui/joy';
import Link from 'next/link';
import type { TestPageDefinition } from '@/lib/content/test-page-registry';

interface TestPageIndexProps {
  title: string;
  description: string;
  pages: readonly TestPageDefinition[];
}

export function TestPageIndex({ title, description, pages }: TestPageIndexProps) {
  return (
    <Box
      component="main"
      sx={{ width: '100%', maxWidth: 960, mx: 'auto', px: { xs: 2, sm: 4 }, py: 5 }}
    >
      <Typography level="h1" sx={{ mb: 1, fontSize: { xs: '1.75rem', sm: '2.25rem' } }}>
        {title}
      </Typography>
      <Typography level="body-md" sx={{ mb: 3, color: 'text.secondary', maxWidth: 720 }}>
        {description}
      </Typography>
      <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {pages.map((page) => (
          <Box component="li" key={page.href}>
            <Button
              component={Link}
              href={page.href}
              variant="outlined"
              color="neutral"
              sx={{
                alignItems: 'flex-start',
                display: 'flex',
                height: 'auto',
                justifyContent: 'flex-start',
                minHeight: 64,
                p: 2,
                textAlign: 'left',
                whiteSpace: 'normal',
                width: '100%',
              }}
            >
              <Box>
                <Typography level="title-md" sx={{ mb: 0.5 }}>
                  {page.title}
                </Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                  {page.purpose}
                </Typography>
              </Box>
            </Button>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
