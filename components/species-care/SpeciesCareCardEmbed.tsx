'use client';

import { Box, Typography } from '@mui/joy';

import { SpeciesCareCardInline } from '@/components/species-care/SpeciesCareCardInline';
import type { SpeciesCareCardEmbedData } from '@/lib/species-care/types';

interface SpeciesCareCardEmbedProps {
  data?: SpeciesCareCardEmbedData;
  tokenKey: string;
  coverImageUrl?: string | null;
  plain?: boolean;
}

export function SpeciesCareCardEmbed({
  data,
  tokenKey,
  coverImageUrl,
  plain,
}: SpeciesCareCardEmbedProps) {
  if (data?.status === 'loaded' && data.record) {
    const photoUrl = data.record.slug
      ? `/api/lore-images/species-photos/${data.record.slug}.png`
      : undefined;
    return <SpeciesCareCardInline record={data.record} photoUrl={photoUrl} plain={plain} />;
  }

  const backgroundImage = coverImageUrl
    ? `linear-gradient(rgba(220, 38, 38, 0.15), rgba(220, 38, 38, 0.15)), url(${coverImageUrl})`
    : 'linear-gradient(135deg, rgba(254, 242, 242, 0.96), rgba(248, 250, 252, 0.96))';

  return (
    <Box
      role="note"
      sx={{
        my: { xs: 3, sm: 5 },
        overflow: 'hidden',
        border: '1px solid rgba(248, 113, 113, 0.42)',
        borderRadius: { xs: '24px', sm: '30px' },
        backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#7f1d1d',
        boxShadow: '0 22px 70px rgba(127, 29, 29, 0.24)',
      }}
    >
      <Box
        sx={{
          bgcolor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(18px)',
          p: { xs: 2, sm: 3 },
        }}
      >
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 950, letterSpacing: '0.14em' }}>
          SPECIES CARD UNAVAILABLE
        </Typography>
        <Typography component="h2" sx={{ mt: 0.75, color: '#450a0a', fontWeight: 950 }}>
          This card could not be loaded.
        </Typography>
        <Typography sx={{ mt: 1, color: '#7f1d1d', fontSize: '1rem', lineHeight: 1.6 }}>
          {data?.error ?? `No species care card data was provided for ${tokenKey}.`}
        </Typography>
      </Box>
    </Box>
  );
}
