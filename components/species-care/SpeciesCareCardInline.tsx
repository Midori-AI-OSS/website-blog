'use client';
// Species healthcare card — inline 3D flip card rendered in lore posts

import { Box, Stack, Typography } from '@mui/joy';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SpeciesCareQr } from '@/components/species-care/SpeciesCareQr';
import type { SpeciesCareCardRecord } from '@/lib/species-care/types';

interface SpeciesCareCardInlineProps {
  record: SpeciesCareCardRecord;
  photoUrl?: string;
  backgroundPhotoUrl?: string;
  plain?: boolean;
}

const CARD_FONT_FAMILY = '"__nextjs-Geist", Inter, var(--joy-fontFamily-fallback)';

const GUILLOCHE_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><path d="M0 60 Q 30 20, 60 60 T 120 60 T 180 60 T 240 60" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.18"/><path d="M0 60 Q 30 100, 60 60 T 120 60 T 180 60 T 240 60" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.14"/><path d="M0 120 Q 30 80, 60 120 T 120 120 T 180 120 T 240 120" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.18"/><path d="M0 120 Q 30 160, 60 120 T 120 120 T 180 120 T 240 120" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.14"/><path d="M0 180 Q 30 140, 60 180 T 120 180 T 180 180 T 240 180" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.18"/><path d="M0 180 Q 30 220, 60 180 T 120 180 T 180 180 T 240 180" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.14"/><path d="M60 0 Q 120 30, 60 60 T 60 120 T 60 180 T 60 240" fill="none" stroke="#94a3b8" stroke-width="0.4" opacity="0.12"/><path d="M120 0 Q 180 30, 120 60 T 120 120 T 120 180 T 120 240" fill="none" stroke="#94a3b8" stroke-width="0.4" opacity="0.12"/><path d="M180 0 Q 240 30, 180 60 T 180 120 T 180 180 T 180 240" fill="none" stroke="#94a3b8" stroke-width="0.4" opacity="0.12"/></svg>`)}`;

const MAX_TILT = 2.5;

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="span"
      level="body-xs"
      sx={{
        color: '#64748b',
        fontSize: '0.64rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        lineHeight: 1.16,
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
        component="span"
        sx={{
          color: '#047857',
          fontSize: { xs: '0.74rem', sm: '0.82rem' },
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Species Healthcare Card
      </Typography>
      <Typography
        component="span"
        sx={{
          color: '#047857',
          fontSize: { xs: '0.74rem', sm: '0.82rem' },
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        ER / EMS
      </Typography>
    </Stack>
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
          fontWeight: 700,
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

function CompactFieldRow({
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
        display: 'grid',
        gridTemplateColumns: { xs: '78px minmax(0, 1fr)', sm: '84px minmax(0, 1fr)' },
        gap: 0.6,
        borderBottom: '1px solid rgba(203, 213, 225, 0.72)',
        py: 0.55,
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <SmallLabel>{label}</SmallLabel>
      <Typography
        component="span"
        sx={{
          minWidth: 0,
          color: '#0f172a',
          fontSize: strong ? { xs: '0.76rem', sm: '0.84rem' } : { xs: '0.66rem', sm: '0.73rem' },
          fontWeight: strong ? 700 : 600,
          lineHeight: 1.18,
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

function CompactFieldPair({
  left,
  right,
  strong = false,
}: {
  left: { label: string; value?: string };
  right: { label: string; value?: string };
  strong?: boolean;
}) {
  if (!left.value && !right.value) return null;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        columnGap: { xs: 1, sm: 1.4 },
        borderBottom: '1px solid rgba(203, 213, 225, 0.72)',
        py: 0.5,
      }}
    >
      {[left, right].map((field) => (
        <Box
          key={field.label}
          sx={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.15,
          }}
        >
          {field.value && (
            <>
              <SmallLabel>{field.label}</SmallLabel>
              <Typography
                component="span"
                sx={{
                  minWidth: 0,
                  color: '#0f172a',
                  fontSize: strong
                    ? { xs: '0.76rem', sm: '0.84rem' }
                    : { xs: '0.66rem', sm: '0.73rem' },
                  fontWeight: strong ? 700 : 600,
                  lineHeight: 1.18,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {field.value}
              </Typography>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
}

function CompactFieldBlock({
  label,
  value,
  strong = false,
  valueColor = '#0f172a',
}: {
  label: string;
  value?: string;
  strong?: boolean;
  valueColor?: string;
}) {
  if (!value) return null;
  return (
    <Box
      sx={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.15,
        borderBottom: '1px solid rgba(203, 213, 225, 0.72)',
        py: 0.5,
      }}
    >
      <SmallLabel>{label}</SmallLabel>
      <Typography
        component="span"
        sx={{
          minWidth: 0,
          color: valueColor,
          fontSize: strong ? { xs: '0.76rem', sm: '0.84rem' } : { xs: '0.66rem', sm: '0.73rem' },
          fontWeight: strong ? 700 : 600,
          lineHeight: 1.18,
          display: '-webkit-box',
          WebkitLineClamp: 4,
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
  backgroundPhotoUrl,
  transform,
  visible,
}: {
  record: SpeciesCareCardRecord;
  photoUrl?: string;
  backgroundPhotoUrl?: string;
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
        backgroundImage: `url("${GUILLOCHE_SVG}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '240px 240px',
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
          inset: 0,
          background:
            'radial-gradient(circle at var(--glare-x, 50%) var(--glare-y, 50%), rgba(255,255,255,0.28) 0%, transparent 55%)',
          opacity: 'var(--glare-opacity, 0)',
          pointerEvents: 'none',
          borderRadius: { xs: '20px', sm: '28px' },
        }}
      />
      {!backgroundPhotoUrl && (
        <Box
          sx={{
            position: 'absolute',
            right: { xs: 12, sm: 18 },
            bottom: { xs: 6, sm: 10 },
            color: 'rgba(15, 23, 42, 0.045)',
            fontSize: { xs: '2.4rem', sm: '3.6rem' },
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {summary.initials}
        </Box>
      )}
      {backgroundPhotoUrl && (
        <Box
          component="img"
          src={backgroundPhotoUrl}
          alt=""
          sx={{
            position: 'absolute',
            right: { xs: 12, sm: 18 },
            bottom: 0,
            maxWidth: { xs: '90px', sm: '130px' },
            maxHeight: { xs: '70px', sm: '100px' },
            objectFit: 'contain',
            opacity: 0.6,
            mixBlendMode: 'multiply',
            borderRadius: { xs: '10px', sm: '14px' },
          }}
        />
      )}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <CardFaceHeader />
        <Box
          sx={{
            mt: { xs: 0.3, sm: 0.5 },
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: '38% 62%', sm: '40% 60%' },
            gap: { xs: 0.8, sm: 1.1 },
            flex: 1,
            minHeight: 0,
          }}
        >
          <PersonPhoto photoUrl={photoUrl} initials={summary.initials} />

          <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack gap={0} sx={{ minWidth: 0 }}>
              <CompactFieldPair
                left={{ label: 'Legal', value: summary.legalName }}
                right={{ label: 'Preferred', value: summary.preferredName }}
                strong
              />
              <CompactFieldPair
                left={{ label: 'Pronouns', value: summary.pronouns }}
                right={{ label: 'DOB / age', value: summary.dobAge }}
              />
              <CompactFieldPair
                left={{ label: 'Sex', value: summary.sex }}
                right={{ label: 'Gender', value: summary.gender }}
              />
              <CompactFieldBlock
                label="Primary care"
                value={summary.primaryCareFlag}
                strong
                valueColor="#064e3b"
              />
            </Stack>

            <Box
              sx={{
                mt: 0.2,
                pt: 0.55,
                color: '#78350f',
                fontSize: { xs: '0.62rem', sm: '0.68rem' },
                fontWeight: 700,
                lineHeight: 1.24,
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
  backgroundPhotoUrl,
  transform,
  visible,
}: {
  record: SpeciesCareCardRecord;
  backgroundPhotoUrl?: string;
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
        backgroundImage: `url("${GUILLOCHE_SVG}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '240px 240px',
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
      {!backgroundPhotoUrl && (
        <Box
          sx={{
            position: 'absolute',
            right: { xs: 12, sm: 18 },
            bottom: { xs: 6, sm: 10 },
            color: 'rgba(15, 23, 42, 0.045)',
            fontSize: { xs: '2.4rem', sm: '3.6rem' },
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {summary.initials}
        </Box>
      )}
      {backgroundPhotoUrl && (
        <Box
          component="img"
          src={backgroundPhotoUrl}
          alt=""
          sx={{
            position: 'absolute',
            right: { xs: 12, sm: 18 },
            bottom: 0,
            maxWidth: { xs: '90px', sm: '130px' },
            maxHeight: { xs: '70px', sm: '100px' },
            objectFit: 'contain',
            opacity: 0.6,
            mixBlendMode: 'multiply',
            borderRadius: { xs: '10px', sm: '14px' },
          }}
        />
      )}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <CardFaceHeader />
        <Box
          sx={{
            mt: { xs: 0.3, sm: 0.5 },
            display: 'grid',
            alignItems: 'center',
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
            <CompactFieldRow label="Lookup" value={summary.fallbackLookupCode} />
            <CompactFieldRow label="DHS ID" value={summary.healthcareId} />
          </Stack>
          <SpeciesCareQr value={summary.webScanPath} size={130} plain />
        </Box>
      </Box>
    </Box>
  );
}

export function SpeciesCareCardInline({
  record,
  photoUrl,
  backgroundPhotoUrl,
  plain,
}: SpeciesCareCardInlineProps) {
  const [flipped, setFlipped] = useState(false);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const interactiveRef = useRef<HTMLButtonElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const rectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const hoverMql = window.matchMedia('(hover: hover) and (pointer: fine)');
    const check = () => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const forcedColors = window.matchMedia('(forced-colors: active)').matches;
      setTiltEnabled(hoverMql.matches && !reducedMotion && !forcedColors);
    };
    check();
    hoverMql.addEventListener('change', check);
    return () => hoverMql.removeEventListener('change', check);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!tiltRef.current || !tiltEnabled || flipped) return;
      if (!rectRef.current)
        rectRef.current = interactiveRef.current?.getBoundingClientRect() ?? null;
      if (!rectRef.current) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = rectRef.current!; // rectRef is guaranteed to have a value here due to check on line 558
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotateX = (y - 0.5) * MAX_TILT * 2;
        const rotateY = (x - 0.5) * MAX_TILT * 2;
        const glareX = `${x * 100}%`;
        const glareY = `${y * 100}%`;

        tiltRef.current?.style.setProperty('--rotate-x', `${rotateX}deg`);
        tiltRef.current?.style.setProperty('--rotate-y', `${rotateY}deg`);
        tiltRef.current?.style.setProperty('--glare-x', glareX);
        tiltRef.current?.style.setProperty('--glare-y', glareY);
      });
    },
    [tiltEnabled, flipped],
  );

  const handleMouseEnter = useCallback(() => {
    if (!tiltEnabled || flipped) return;
    rectRef.current = interactiveRef.current?.getBoundingClientRect() ?? null;
    tiltRef.current?.style.setProperty('--glare-opacity', '1');
    tiltRef.current?.style.removeProperty('transition');
  }, [tiltEnabled, flipped]);

  const handleMouseLeave = useCallback(() => {
    if (!tiltEnabled) return;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    rectRef.current = null;
    tiltRef.current?.style.setProperty('--rotate-x', '0deg');
    tiltRef.current?.style.setProperty('--rotate-y', '0deg');
    tiltRef.current?.style.setProperty('--glare-opacity', '0');
    tiltRef.current!.style.transition = 'transform 0.4s ease-out';
  }, [tiltEnabled]);

  useEffect(() => {
    if (tiltRef.current) {
      tiltRef.current.style.setProperty('--rotate-x', '0deg');
      tiltRef.current.style.setProperty('--rotate-y', '0deg');
      tiltRef.current.style.setProperty('--glare-opacity', '0');
    }
  }, [flipped]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <Box
      sx={
        plain
          ? { width: '100%' }
          : {
              my: { xs: 3, sm: 5 },
              mx: 'auto',
              width: '100%',
              border: '1px solid rgba(219, 234, 254, 0.9)',
              borderRadius: { xs: '24px', sm: '32px' },
              bgcolor: 'rgba(248,250,252,0.94)',
              color: '#0f172a',
              '--joy-fontFamily-body': CARD_FONT_FAMILY,
              fontFamily: CARD_FONT_FAMILY,
              p: { xs: 1.25, sm: 2 },
              boxShadow: '0 24px 80px rgba(15,23,42,0.25)',
              '& p': {
                m: 0,
              },
              '&& img': {
                m: 0,
                border: 0,
                background: 'none',
                animation: 'none',
              },
            }
      }
    >
      <Box
        sx={{
          mx: plain ? undefined : 'auto',
          width: '100%',
          maxWidth: plain ? undefined : { sm: 360, md: 580 },
          perspective: '1400px',
        }}
      >
        <Box
          ref={interactiveRef}
          component="button"
          onClick={() => setFlipped((v) => !v)}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-pressed={flipped}
          aria-label={flipped ? 'Show front of card' : 'Show back of card'}
          sx={{
            textAlign: 'start',
            position: 'relative',
            width: '100%',
            aspectRatio: '534 / 336',
            maxHeight: { xs: 300, sm: 280, md: 320 },
            cursor: 'pointer',
            userSelect: 'none',
            border: 0,
            padding: 0,
            background: 'transparent',
            '&:focus-visible': {
              outline: '2px solid #2563eb',
              outlineOffset: '4px',
              borderRadius: { xs: '20px', sm: '28px' },
            },
          }}
        >
          <Box
            ref={tiltRef}
            sx={{
              position: 'absolute',
              inset: 0,
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              transform: flipped
                ? 'none'
                : 'rotateX(var(--rotate-x, 0deg)) rotateY(var(--rotate-y, 0deg))',
              borderRadius: { xs: '20px', sm: '28px' },
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
                backgroundPhotoUrl={backgroundPhotoUrl}
                transform="rotateY(0deg) translateZ(0)"
                visible={!flipped}
              />
              <BackCard
                record={record}
                backgroundPhotoUrl={backgroundPhotoUrl}
                transform="rotateY(180deg) translateZ(0)"
                visible={flipped}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
