'use client';

import { Box, Button, Option, Select, Stack, Typography } from '@mui/joy';
import { ArrowLeft, BadgeCheck, HeartPulse, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

import type {
  SpeciesCareCardRecord,
  SpeciesCareCardVersionMetadata,
  SpeciesCareField,
  SpeciesCareScanSection,
} from '@/lib/species-care/types';

interface SpeciesCareScanViewProps {
  record: SpeciesCareCardRecord;
  availableVersions: SpeciesCareCardVersionMetadata[];
  photoUrl?: string;
}

function PortalLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        color: '#64748b',
        fontSize: '0.72rem',
        fontWeight: 950,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  );
}

function InfoTile({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Box
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        bgcolor: '#f8fafc',
        p: 1.5,
      }}
    >
      <PortalLabel>{label}</PortalLabel>
      <Typography sx={{ mt: 0.5, color: '#0f172a', fontWeight: 800, lineHeight: 1.35 }}>
        {value}
      </Typography>
    </Box>
  );
}

function FieldBlock({ field }: { field: SpeciesCareField }) {
  return (
    <Box>
      <Typography
        sx={{
          color: '#1d4ed8',
          fontSize: '0.76rem',
          fontWeight: 950,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {field.label}
      </Typography>
      <Typography sx={{ mt: 0.35, color: '#334155', fontSize: '0.96rem', lineHeight: 1.55 }}>
        {field.value}
      </Typography>
    </Box>
  );
}

function ScanSectionCard({ section }: { section: SpeciesCareScanSection }) {
  return (
    <Box
      component="section"
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        bgcolor: '#fff',
        p: { xs: 2, sm: 2.5 },
        boxShadow: '0 18px 50px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Typography component="h2" sx={{ color: '#0f172a', fontSize: '1.03rem', fontWeight: 950 }}>
        {section.title}
      </Typography>
      <Stack gap={1.65} sx={{ mt: 2 }}>
        {section.body.map((line) => (
          <Typography key={line} sx={{ color: '#334155', lineHeight: 1.55 }}>
            {line}
          </Typography>
        ))}
        {section.fields.map((field) => (
          <FieldBlock key={`${field.label}:${field.value}`} field={field} />
        ))}
        {section.subsections.map((subsection) => (
          <Box key={subsection.title} sx={{ borderLeft: '3px solid #bfdbfe', pl: 1.5, py: 0.5 }}>
            <Typography sx={{ color: '#0f172a', fontWeight: 900 }}>{subsection.title}</Typography>
            <Stack gap={1} sx={{ mt: 1 }}>
              {subsection.body.map((line) => (
                <Typography key={line} sx={{ color: '#334155', lineHeight: 1.5 }}>
                  {line}
                </Typography>
              ))}
              {subsection.fields.map((field) => (
                <FieldBlock key={`${subsection.title}:${field.label}`} field={field} />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function pickVersionLabel(version: SpeciesCareCardVersionMetadata): string {
  return `${version.profileVersion} (${version.version})`;
}

export function SpeciesCareScanView({
  record,
  availableVersions,
  photoUrl,
}: SpeciesCareScanViewProps) {
  const summary = record.summary;
  const versions =
    availableVersions.length > 0 ? availableVersions : (record.metadata?.versions ?? []);

  function handleVersionChange(_: unknown, value: string | null) {
    if (!value || value === record.version) return;
    const target = new URL(summary.webScanPath, window.location.origin);
    target.searchParams.set('version', value);
    window.location.assign(target.toString());
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        color: '#0f172a',
        bgcolor: '#f6f8fb',
        background:
          'radial-gradient(circle at 0% 0%, rgba(219,234,254,0.95), transparent 30%), radial-gradient(circle at 100% 0%, rgba(204,251,241,0.78), transparent 28%), linear-gradient(180deg, #ffffff 0%, #f6f8fb 42%, #eef3f8 100%)',
        px: { xs: 1.5, sm: 3, lg: 4 },
        py: { xs: 2, sm: 3, lg: 4 },
        pb: { xs: 12, sm: 14 },
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: { xs: '100%', sm: '100%', md: '90%', lg: '80%' },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Button
            component={Link}
            href="/lore"
            variant="plain"
            startDecorator={<ArrowLeft size={18} />}
            sx={{
              minHeight: 44,
              borderRadius: '14px',
              color: '#334155',
              bgcolor: 'rgba(255,255,255,0.55)',
              '&:hover': {
                color: '#1d4ed8',
                bgcolor: '#eff6ff',
              },
              '&:active': {
                color: '#1e40af',
                bgcolor: '#dbeafe',
              },
              '&:focus-visible': {
                outline: '2px solid #2563eb',
                outlineOffset: '2px',
              },
            }}
          >
            Back to lore
          </Button>
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 1,
              border: '1px solid #bfdbfe',
              borderRadius: '999px',
              bgcolor: 'rgba(255,255,255,0.72)',
              px: 1.5,
              py: 0.75,
              color: '#1d4ed8',
              fontWeight: 900,
            }}
          >
            <BadgeCheck size={18} /> Emergency access view
          </Box>
        </Stack>

        <Box
          component="header"
          sx={{
            mt: 2,
            border: '1px solid rgba(191, 219, 254, 0.9)',
            borderRadius: { xs: '28px', sm: '36px' },
            bgcolor: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(24px)',
            p: { xs: 2, sm: 3, lg: 4 },
            boxShadow: '0 30px 90px rgba(37, 99, 235, 0.12)',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <ShieldAlert size={20} color="#2563eb" />
              <PortalLabel>DHS Care Registry</PortalLabel>
            </Stack>
            <Typography
              component="h1"
              sx={{
                mt: 1.2,
                color: '#0f172a',
                fontSize: { xs: '1.7rem', sm: '2rem', lg: '2.2rem' },
                fontWeight: 950,
                letterSpacing: '-0.055em',
                lineHeight: 0.98,
              }}
            >
              {summary.preferredName} Care Record
            </Typography>
            {versions.length > 0 && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                gap={1.5}
                alignItems={{ sm: 'center' }}
                sx={{ mt: 1.5 }}
              >
                <Select
                  value={record.version}
                  onChange={handleVersionChange}
                  slotProps={{
                    listbox: {
                      sx: {
                        bgcolor: '#fff',
                        color: '#0f172a',
                        border: '1px solid #dbeafe',
                        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16)',
                        '--ListItem-radius': '12px',
                        '--ListItemDecorator-color': '#2563eb',
                      },
                    },
                  }}
                  sx={{
                    minHeight: 44,
                    minWidth: { xs: '100%', sm: 240 },
                    borderRadius: '14px',
                    bgcolor: '#fff',
                    color: '#0f172a',
                    borderColor: '#bfdbfe',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)',
                    '&:hover': {
                      bgcolor: '#f8fafc',
                      borderColor: '#60a5fa',
                    },
                    '&:focus-within': {
                      outline: '2px solid #2563eb',
                      outlineOffset: '2px',
                    },
                    '& .MuiSelect-indicator': {
                      color: '#2563eb',
                    },
                  }}
                >
                  {versions.map((version) => (
                    <Option
                      key={version.version}
                      value={version.version}
                      sx={{
                        color: '#0f172a',
                        bgcolor: '#fff',
                        '&:hover': {
                          bgcolor: '#eff6ff',
                          color: '#1d4ed8',
                        },
                        '&[aria-selected="true"]': {
                          bgcolor: '#dbeafe',
                          color: '#1e3a8a',
                          fontWeight: 900,
                        },
                      }}
                    >
                      {pickVersionLabel(version)}
                    </Option>
                  ))}
                </Select>
                {summary.qrCode && (
                  <Typography
                    sx={{
                      color: '#64748b',
                      fontSize: { xs: '0.68rem', sm: '0.74rem' },
                      fontWeight: 700,
                      lineHeight: 1.2,
                      wordBreak: 'break-all',
                    }}
                  >
                    {summary.qrCode}
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '380px minmax(0, 1fr)' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Stack
            component="aside"
            gap={2}
            sx={{
              border: '1px solid #e2e8f0',
              borderRadius: '28px',
              bgcolor: 'rgba(255,255,255,0.86)',
              p: { xs: 2, sm: 2.5 },
              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.08)',
              position: { lg: 'sticky' },
              top: { lg: 24 },
            }}
          >
            <Stack direction="row" gap={1.5} alignItems="center">
              {photoUrl ? (
                <Box
                  component="img"
                  src={photoUrl}
                  alt=""
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = (e.target as HTMLImageElement)
                      .nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'grid';
                  }}
                  sx={{
                    width: 68,
                    height: 68,
                    borderRadius: '22px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : null}
              <Box
                sx={{
                  width: 68,
                  height: 68,
                  borderRadius: '22px',
                  display: photoUrl ? 'none' : 'grid',
                  placeItems: 'center',
                  bgcolor: '#dbeafe',
                  color: '#1e3a8a',
                  fontSize: '1.55rem',
                  fontWeight: 950,
                }}
              >
                {summary.initials}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: 950 }}>
                  {summary.preferredName}
                </Typography>
                <Typography sx={{ color: '#64748b', fontWeight: 750 }}>
                  {summary.pronouns ?? summary.profileVersion}
                </Typography>
              </Box>
            </Stack>

            <InfoTile label="Species" value={summary.species} />
            <InfoTile label="Healthcare ID" value={summary.healthcareId} />
            <InfoTile label="Support / advocate" value={summary.advocateContact} />
            <InfoTile label="Emergency contact" value={summary.emergencyContact} />
          </Stack>

          <Stack gap={3} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                border: '1px solid #fecdd3',
                borderRadius: '28px',
                bgcolor: '#fff1f2',
                p: { xs: 2, sm: 3 },
                boxShadow: '0 24px 70px rgba(225, 29, 72, 0.08)',
              }}
            >
              <Stack direction="row" gap={1} alignItems="center">
                <HeartPulse size={20} color="#be123c" />
                <PortalLabel>Critical banner</PortalLabel>
              </Stack>
              <Typography
                sx={{
                  mt: 1,
                  color: '#881337',
                  fontSize: { xs: '1.2rem', sm: '1.45rem' },
                  fontWeight: 950,
                  lineHeight: 1.25,
                }}
              >
                {summary.criticalBanner}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 2,
              }}
            >
              {record.scanSections.map((section) => (
                <ScanSectionCard key={section.title} section={section} />
              ))}
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
