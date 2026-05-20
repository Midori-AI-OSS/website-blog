'use client';

import { Box, Stack, Typography } from '@mui/joy';
import { useState } from 'react';

import { SpeciesCareQr } from '@/components/species-care/SpeciesCareQr';
import type { SpeciesCareCardRecord } from '@/lib/species-care/types';

interface SpeciesCareCardInlineProps {
  record: SpeciesCareCardRecord;
  photoUrl?: string;
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      level="body-xs"
      sx={{
        color: '#64748b',
        fontSize: '0.6rem',
        fontWeight: 900,
        letterSpacing: '0.12em',
        lineHeight: 1.1,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  );
}

function CardFaceHeader() {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1.5}>
      <Typography
        sx={{
          color: '#047857',
          fontSize: { xs: '0.7rem', sm: '0.78rem' },
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Species Healthcare Card
      </Typography>
      <Typography
        sx={{
          color: '#047857',
          fontSize: { xs: '0.7rem', sm: '0.78rem' },
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        ER / EMS
      </Typography>
    </Stack>
  );
}

function DemoTile({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: string;
  strong?: boolean;
}) {
  if (!value) return null;
  return (
    <Box
      sx={{
        border: '1px solid rgba(148, 163, 184, 0.28)',
        borderRadius: '11px',
        bgcolor: 'rgba(255,255,255,0.7)',
        px: { xs: 0.65, sm: 0.85 },
        py: { xs: 0.5, sm: 0.6 },
        boxShadow: '0 1px 0 rgba(255,255,255,0.88) inset',
      }}
    >
      <SmallLabel>{label}</SmallLabel>
      <Typography
        sx={{
          mt: 0.25,
          color: '#0f172a',
          fontSize: strong ? { xs: '0.72rem', sm: '0.8rem' } : { xs: '0.65rem', sm: '0.72rem' },
          fontWeight: strong ? 900 : 750,
          lineHeight: 1.1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function PersonPhoto({ photoUrl, initials }: { photoUrl?: string; initials: string }) {
  const [errored, setErrored] = useState(false);

  if (!photoUrl || errored) {
    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: { xs: '14px', sm: '18px' },
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#dbeafe',
          color: '#1e3a8a',
          fontSize: { xs: '1.8rem', sm: '2.6rem' },
          fontWeight: 950,
        }}
      >
        {initials}
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={photoUrl}
      alt=""
      onError={() => setErrored(true)}
      sx={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: { xs: '14px', sm: '18px' },
        objectFit: 'cover',
        display: 'block',
      }}
    />
  );
}

function CompactFieldRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '72px minmax(0, 1fr)',
        gap: 0.6,
        borderBottom: '1px solid rgba(203, 213, 225, 0.72)',
        py: 0.55,
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <SmallLabel>{label}</SmallLabel>
      <Typography
        sx={{
          minWidth: 0,
          color: '#0f172a',
          fontSize: { xs: '0.62rem', sm: '0.69rem' },
          fontWeight: 750,
          lineHeight: 1.12,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function FrontCard({
  record,
  photoUrl,
  transform,
  visible,
}: {
  record: SpeciesCareCardRecord;
  photoUrl?: string;
  transform: string;
  visible: boolean;
}) {
  const summary = record.summary;
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        border: '1px solid rgba(148, 163, 184, 0.42)',
        borderRadius: { xs: '20px', sm: '28px' },
        bgcolor: '#f8fafc',
        color: '#0f172a',
        boxShadow: '0 30px 70px rgba(15, 23, 42, 0.24)',
        transform,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 0% 0%, rgba(20,184,166,0.16), transparent 34%), radial-gradient(circle at 100% 0%, rgba(37,99,235,0.13), transparent 32%), linear-gradient(135deg, #ffffff, #f8fafc 62%, #eef6ff)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 12, sm: 18 },
          bottom: { xs: 6, sm: 10 },
          color: 'rgba(15, 23, 42, 0.045)',
          fontSize: { xs: '2.4rem', sm: '3.6rem' },
          fontWeight: 950,
          lineHeight: 1,
        }}
      >
        {summary.initials}
      </Box>
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          p: { xs: 3, sm: 4 },
        }}
      >
        <CardFaceHeader />
        <Box
          sx={{
            mt: { xs: 0.6, sm: 0.9 },
            display: 'grid',
            gridTemplateColumns: '384px minmax(0, 1fr)',
            gap: { xs: 0.8, sm: 1.1 },
            flex: 1,
            minHeight: 0,
          }}
        >
          <PersonPhoto photoUrl={photoUrl} initials={summary.initials} />

          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Box
              sx={{
                border: '1px solid #86efac',
                borderRadius: '13px',
                bgcolor: '#ecfdf5',
                px: { xs: 0.7, sm: 0.9 },
                py: { xs: 0.5, sm: 0.6 },
                mb: { xs: 0.5, sm: 0.65 },
              }}
            >
              <SmallLabel>Primary care flag</SmallLabel>
              <Typography
                sx={{
                  mt: 0.2,
                  color: '#064e3b',
                  fontSize: { xs: '0.66rem', sm: '0.74rem' },
                  fontWeight: 950,
                  lineHeight: 1.12,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {summary.primaryCareFlag}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: { xs: 0.5, sm: 0.6 },
                flex: 1,
                alignContent: 'start',
              }}
            >
              <DemoTile label="Legal" value={summary.legalName} strong />
              <DemoTile label="Preferred" value={summary.preferredName} strong />
              <DemoTile label="Pronouns" value={summary.pronouns} />
              <DemoTile label="DOB / age" value={summary.dobAge} />
              <DemoTile label="Sex" value={summary.sex} />
              <DemoTile label="Gender" value={summary.gender} />
            </Box>

            <Box
              sx={{
                mt: 'auto',
                border: '1px solid #fde68a',
                borderRadius: '11px',
                bgcolor: '#fffbeb',
                color: '#78350f',
                px: 0.8,
                py: 0.45,
                fontSize: { xs: '0.58rem', sm: '0.63rem' },
                fontWeight: 800,
                lineHeight: 1.18,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {summary.identityCaution ?? 'Species/patient guidance only.'} Scan QR on reverse for
              full record.
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function BackCard({
  record,
  transform,
  visible,
}: {
  record: SpeciesCareCardRecord;
  transform: string;
  visible: boolean;
}) {
  const summary = record.summary;
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        border: '1px solid rgba(148, 163, 184, 0.42)',
        borderRadius: { xs: '20px', sm: '28px' },
        bgcolor: '#f8fafc',
        color: '#0f172a',
        boxShadow: '0 30px 70px rgba(15, 23, 42, 0.24)',
        transform,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 0% 0%, rgba(20,184,166,0.16), transparent 34%), radial-gradient(circle at 100% 0%, rgba(37,99,235,0.13), transparent 32%), linear-gradient(135deg, #ffffff, #f8fafc 62%, #eef6ff)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: { xs: 12, sm: 18 },
          bottom: { xs: 6, sm: 10 },
          color: 'rgba(15, 23, 42, 0.045)',
          fontSize: { xs: '2.4rem', sm: '3.6rem' },
          fontWeight: 950,
          lineHeight: 1,
        }}
      >
        {summary.initials}
      </Box>
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          p: { xs: 3, sm: 4 },
        }}
      >
        <CardFaceHeader />
        <Box
          sx={{
            mt: { xs: 0.6, sm: 0.9 },
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: { xs: 1, sm: 1.4 },
            flex: 1,
            minHeight: 0,
          }}
        >
          <Stack gap={{ xs: 0.5, sm: 0.65 }} sx={{ minWidth: 0 }}>
            <CompactFieldRow label="Emergency" value={summary.emergencyContact} />
            <CompactFieldRow label="Advocate" value={summary.advocateContact} />
            <CompactFieldRow label="Issued by" value={summary.issuedBy} />
            <CompactFieldRow label="Registry" value={summary.registeredWith} />
          </Stack>
          <SpeciesCareQr value={summary.webScanPath} size={400} />
        </Box>
      </Box>
    </Box>
  );
}

export function SpeciesCareCardInline({ record, photoUrl }: SpeciesCareCardInlineProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Box
      sx={{
        my: { xs: 3, sm: 5 },
        mx: 'auto',
        width: '100%',
        border: '1px solid rgba(219, 234, 254, 0.9)',
        borderRadius: { xs: '24px', sm: '32px' },
        bgcolor: 'rgba(248,250,252,0.94)',
        color: '#0f172a',
        p: { xs: 1.25, sm: 2 },
        boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
      }}
    >
      <Box sx={{ mx: 'auto', width: '100%', perspective: '1400px' }}>
        <Box
          onClick={() => setFlipped((value) => !value)}
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '534 / 336',
            maxHeight: { xs: 340, sm: 420, md: 500 },
            cursor: 'pointer',
            userSelect: 'none',
            '&:focus-visible': {
              outline: '2px solid #2563eb',
              outlineOffset: '4px',
              borderRadius: { xs: '20px', sm: '28px' },
            },
          }}
          tabIndex={0}
          role="button"
          aria-label={flipped ? 'Show front of card' : 'Show back of card'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFlipped((value) => !value);
            }
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              transition: 'transform 650ms cubic-bezier(.2,.8,.2,1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          >
            <FrontCard
              record={record}
              photoUrl={photoUrl}
              transform="rotateY(0deg) translateZ(0)"
              visible={!flipped}
            />
            <BackCard record={record} transform="rotateY(180deg) translateZ(0)" visible={flipped} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
