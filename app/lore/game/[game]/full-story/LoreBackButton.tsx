'use client';

import Link from 'next/link';
import { Button } from '@mui/joy';
import { ArrowLeft } from 'lucide-react';

export function LoreBackButton() {
  return (
    <Button
      component={Link}
      href="/lore"
      variant="plain"
      color="neutral"
      startDecorator={<ArrowLeft size={18} />}
      sx={{
        mb: { xs: 2, sm: 4 },
        alignSelf: 'flex-start',
        minHeight: 44,
        width: { xs: '100%', sm: 'auto' },
        justifyContent: 'flex-start',
      }}
    >
      Back to lore
    </Button>
  );
}
