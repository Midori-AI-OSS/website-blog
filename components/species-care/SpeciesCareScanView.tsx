'use client';

import { Box, Button, Option, Select, Stack, Typography } from '@mui/joy';
import { ArrowLeft, BadgeCheck, FileHeart, HeartPulse, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type {
  SpeciesCareCardRecord,
  SpeciesCareCardVersionMetadata,
  SpeciesCareField,
  SpeciesCareLinkedProfile,
  SpeciesCareProfileVersionMetadata,
  SpeciesCareScanSection,
} from '@/lib/species-care/types';

interface SpeciesCareScanViewProps {
  record: SpeciesCareCardRecord;
  availableVersions: SpeciesCareCardVersionMetadata[];
  linkedProfile?: SpeciesCareLinkedProfile;
  photoUrl?: string;
}

const CARE_FONT_FAMILY = 'Inter, var(--joy-fontFamily-fallback)';
const PANEL_BORDER = '1px solid #dbe3ea';
const PANEL_RADIUS = '8px';
const PANEL_SHADOW = '0 1px 3px rgba(15, 23, 42, 0.06)';
const RECORD_STATUS_TITLE = 'Record Status';
const PATIENT_SIGNATURE_LABEL = 'Patient signature';

const panelSx = {
  border: PANEL_BORDER,
  borderRadius: PANEL_RADIUS,
  bgcolor: '#fff',
  boxShadow: PANEL_SHADOW,
};

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function getSectionByTitle(
  sections: SpeciesCareScanSection[],
  title: string,
): SpeciesCareScanSection | undefined {
  return sections.find((section) => normalizeLabel(section.title) === normalizeLabel(title));
}

function getFieldByLabel(fields: SpeciesCareField[], label: string): SpeciesCareField | undefined {
  return fields.find((field) => normalizeLabel(field.label) === normalizeLabel(label));
}

function getFinalRecordStatusField(section?: SpeciesCareScanSection): SpeciesCareField | undefined {
  const finalField = section?.fields.at(-1);
  if (!finalField || normalizeLabel(finalField.label) === normalizeLabel(PATIENT_SIGNATURE_LABEL)) {
    return undefined;
  }
  return finalField;
}

function PortalLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        color: '#52647a',
        fontSize: '0.72rem',
        letterSpacing: '0.1em',
        lineHeight: 1.25,
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
        borderTop: '1px solid #e2e8f0',
        pt: 1,
        minWidth: 0,
      }}
    >
      <PortalLabel>{label}</PortalLabel>
      <Typography
        sx={{
          mt: 0.4,
          color: '#172033',
          fontSize: '0.95rem',
          fontWeight: 700,
          lineHeight: 1.45,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
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
          color: '#52647a',
          fontSize: '0.72rem',
          fontWeight: 900,
          lineHeight: 1.25,
          textTransform: 'uppercase',
        }}
      >
        {field.label}
      </Typography>
      <Typography sx={{ mt: 0.4, color: '#334155', fontSize: '0.96rem', lineHeight: 1.55 }}>
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
        ...panelSx,
        p: { xs: 1.5, sm: 2 },
      }}
    >
      <Typography
        component="h2"
        sx={{ color: '#0f172a', fontSize: '1rem', fontWeight: 900, lineHeight: 1.25 }}
      >
        {section.title}
      </Typography>
      <Stack gap={1.25} sx={{ mt: 1.5 }}>
        {section.body.map((line) => (
          <Typography key={line} sx={{ color: '#334155', fontSize: '0.96rem', lineHeight: 1.55 }}>
            {line}
          </Typography>
        ))}
        {section.fields.map((field) => (
          <FieldBlock key={`${field.label}:${field.value}`} field={field} />
        ))}
        {section.subsections.map((subsection) => (
          <Box key={subsection.title} sx={{ borderLeft: '3px solid #bfdbfe', pl: 1.5, py: 0.5 }}>
            <Typography
              sx={{ color: '#0f172a', fontSize: '0.96rem', fontWeight: 900, lineHeight: 1.35 }}
            >
              {subsection.title}
            </Typography>
            <Stack gap={1} sx={{ mt: 1 }}>
              {subsection.body.map((line) => (
                <Typography
                  key={line}
                  sx={{ color: '#334155', fontSize: '0.96rem', lineHeight: 1.55 }}
                >
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

function pickVersionLabel(
  version: SpeciesCareCardVersionMetadata | SpeciesCareProfileVersionMetadata,
): string {
  return `${version.profileVersion} (${version.version})`;
}

function ClinicalViewSwitcher({
  value,
  onChange,
}: {
  value: 'patient' | 'protocol';
  onChange: (value: 'patient' | 'protocol') => void;
}) {
  const options: Array<{ value: 'patient' | 'protocol'; label: string }> = [
    { value: 'protocol', label: 'Species protocol' },
    { value: 'patient', label: 'Patient record' },
  ];

  return (
    <Box
      role="tablist"
      aria-label="Clinical record view"
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0.5,
        border: '1px solid #cbd5e1',
        borderRadius: PANEL_RADIUS,
        bgcolor: '#eef2f7',
        p: 0.5,
      }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Button
            key={option.value}
            role="tab"
            aria-selected={selected}
            variant={selected ? 'solid' : 'plain'}
            onClick={() => onChange(option.value)}
            sx={{
              minHeight: 44,
              px: { xs: 1, sm: 1.5 },
              borderRadius: '6px',
              bgcolor: selected ? '#0f172a' : 'transparent',
              color: selected ? '#fff' : '#334155',
              fontWeight: 900,
              fontSize: { xs: '0.88rem', sm: '0.95rem' },
              '&:hover': {
                bgcolor: selected ? '#1e293b' : '#e2e8f0',
              },
              '&:focus-visible': {
                outline: '2px solid #2563eb',
                outlineOffset: '2px',
              },
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </Box>
  );
}

export function SpeciesCareScanView({
  record,
  availableVersions,
  linkedProfile,
  photoUrl,
}: SpeciesCareScanViewProps) {
  const summary = record.summary;
  const versions =
    availableVersions.length > 0 ? availableVersions : (record.metadata?.versions ?? []);
  const [clinicalView, setClinicalView] = useState<'patient' | 'protocol'>('patient');
  const profileVersions =
    linkedProfile && linkedProfile.availableVersions.length > 0
      ? linkedProfile.availableVersions
      : (linkedProfile?.record.metadata?.versions ?? []);
  const recordStatusSection = getSectionByTitle(record.scanSections, RECORD_STATUS_TITLE);
  const patientSignature =
    getFieldByLabel(recordStatusSection?.fields ?? [], PATIENT_SIGNATURE_LABEL)?.value ??
    summary.patientSignature;
  const finalRecordStatusField = getFinalRecordStatusField(recordStatusSection);
  const patientRecordSections = record.scanSections.filter(
    (section) => normalizeLabel(section.title) !== normalizeLabel(RECORD_STATUS_TITLE),
  );
  const activeSections =
    clinicalView === 'protocol' && linkedProfile
      ? linkedProfile.record.sections
      : patientRecordSections;
  const criticalNote = summary.primaryCareFlag || summary.criticalBanner;
  const patientFirstName = summary.preferredName.split(' ')[0] ?? summary.preferredName;

  function handleVersionChange(_: unknown, value: string | null) {
    if (!value || value === record.version) return;
    const target = new URL(window.location.href);
    target.searchParams.set('version', value);
    window.location.assign(target.toString());
  }

  function handleProfileVersionChange(_: unknown, value: string | null) {
    if (!value || !linkedProfile || value === linkedProfile.record.version) return;
    const target = new URL(window.location.href);
    target.searchParams.set('profileVersion', value);
    window.location.assign(target.toString());
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        color: '#0f172a',
        bgcolor: '#f4f6f8',
        '--joy-fontFamily-body': CARE_FONT_FAMILY,
        fontFamily: CARE_FONT_FAMILY,
        px: { xs: 1.25, sm: 2, lg: 3 },
        py: { xs: 1.5, sm: 2, lg: 2.5 },
        pb: { xs: 8, sm: 10 },
      }}
    >
      <Box
        sx={{
          mx: 'auto',
          maxWidth: '1440px',
        }}
      >
        <Box
          component="header"
          sx={{
            ...panelSx,
            p: { xs: 1.25, sm: 1.5 },
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
            gap={1.25}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              gap={{ xs: 1, sm: 1.5 }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ minWidth: 0 }}
            >
              <Button
                component={Link}
                href="/lore"
                variant="plain"
                startDecorator={<ArrowLeft size={18} />}
                sx={{
                  minHeight: 44,
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                  borderRadius: '6px',
                  color: '#334155',
                  '&:hover': {
                    color: '#0f172a',
                    bgcolor: '#e2e8f0',
                  },
                  '&:focus-visible': {
                    outline: '2px solid #2563eb',
                    outlineOffset: '2px',
                  },
                }}
              >
                Back
              </Button>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <ShieldAlert size={18} color="#2563eb" />
                  <PortalLabel>DHS Care Registry</PortalLabel>
                  <Box sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: '#64748b' }}>
                    <BadgeCheck size={16} />
                  </Box>
                </Stack>
                <Typography
                  component="h1"
                  sx={{
                    mt: 0.35,
                    color: '#0f172a',
                    fontSize: { xs: '1.28rem', sm: '1.45rem', lg: '1.55rem' },
                    fontWeight: 900,
                    lineHeight: 1.08,
                  }}
                >
                  {summary.preferredName} Care Record
                </Typography>
                {summary.qrCode && (
                  <Typography
                    sx={{
                      mt: 0.35,
                      color: '#64748b',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      lineHeight: 1.25,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {summary.qrCode}
                  </Typography>
                )}
              </Box>
            </Stack>
            {versions.length > 0 && (
              <Box sx={{ flex: '0 0 auto' }}>
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
                    minWidth: { xs: '100%', md: 250 },
                    borderRadius: '6px',
                    bgcolor: '#fff',
                    color: '#0f172a',
                    borderColor: '#cbd5e1',
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
                    '& .MuiSelect-button': {
                      minHeight: 44,
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
              </Box>
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '320px minmax(0, 1fr)' },
            gap: { xs: 1.5, lg: 2 },
            alignItems: 'start',
          }}
        >
          <Stack
            component="aside"
            gap={2}
            sx={{
              ...panelSx,
              p: { xs: 1.5, sm: 1.75 },
              position: { lg: 'sticky' },
              top: { lg: 20 },
            }}
          >
            <Stack direction="row" gap={1.25} alignItems="center">
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
                    width: 60,
                    height: 60,
                    borderRadius: '8px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : null}
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '8px',
                  display: photoUrl ? 'none' : 'grid',
                  placeItems: 'center',
                  bgcolor: '#dbeafe',
                  color: '#1e3a8a',
                  fontSize: '1.55rem',
                  fontWeight: 900,
                }}
              >
                {summary.initials}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{ color: '#0f172a', fontSize: '1.22rem', fontWeight: 900, lineHeight: 1.1 }}
                >
                  {patientFirstName}
                </Typography>
                <Typography
                  sx={{ mt: 0.15, color: '#334155', fontSize: '0.95rem', fontWeight: 800 }}
                >
                  {summary.preferredName}
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.92rem', fontWeight: 700 }}>
                  {summary.pronouns ?? summary.profileVersion}
                </Typography>
              </Box>
            </Stack>

            {criticalNote && (
              <Box
                sx={{
                  border: '1px solid #fecaca',
                  borderLeft: '4px solid #dc2626',
                  borderRadius: PANEL_RADIUS,
                  bgcolor: '#fff7ed',
                  p: 1.25,
                }}
              >
                <Stack direction="row" gap={0.75} alignItems="center">
                  <HeartPulse size={17} color="#b91c1c" />
                  <Typography
                    sx={{
                      color: '#991b1b',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                    }}
                  >
                    Critical
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    mt: 0.65,
                    color: '#0f172a',
                    fontSize: '0.96rem',
                    fontWeight: 800,
                    lineHeight: 1.38,
                  }}
                >
                  {criticalNote}
                </Typography>
              </Box>
            )}

            <InfoTile label="Species" value={summary.species} />
            <InfoTile label="Healthcare ID" value={summary.healthcareId} />
            <InfoTile label="Support / advocate" value={summary.advocateContact} />
            <InfoTile label="Emergency contact" value={summary.emergencyContact} />
            <InfoTile label={PATIENT_SIGNATURE_LABEL} value={patientSignature} />
            {finalRecordStatusField && (
              <InfoTile label={finalRecordStatusField.label} value={finalRecordStatusField.value} />
            )}
          </Stack>

          <Stack gap={1.5} sx={{ minWidth: 0 }}>
            {linkedProfile && (
              <Stack gap={1.25}>
                <ClinicalViewSwitcher value={clinicalView} onChange={setClinicalView} />
                {clinicalView === 'protocol' && (
                  <Box
                    sx={{
                      ...panelSx,
                      p: { xs: 1.5, sm: 2 },
                    }}
                  >
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      gap={1.5}
                      alignItems={{ sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" gap={1} alignItems="center">
                          <FileHeart size={18} color="#1d4ed8" />
                          <Typography
                            component="h2"
                            sx={{
                              color: '#0f172a',
                              fontSize: '1rem',
                              fontWeight: 900,
                              lineHeight: 1.25,
                            }}
                          >
                            {linkedProfile.record.title}
                          </Typography>
                        </Stack>
                        <Typography
                          sx={{ mt: 0.3, color: '#64748b', fontSize: '0.88rem', fontWeight: 700 }}
                        >
                          {linkedProfile.record.designation} / {linkedProfile.record.profileVersion}
                        </Typography>
                      </Box>
                      {profileVersions.length > 1 && (
                        <Select
                          value={linkedProfile.record.version}
                          onChange={handleProfileVersionChange}
                          slotProps={{
                            listbox: {
                              sx: {
                                bgcolor: '#fff',
                                color: '#0f172a',
                                border: '1px solid #dbeafe',
                                boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16)',
                                '--ListItem-radius': '12px',
                              },
                            },
                          }}
                          sx={{
                            minHeight: 44,
                            minWidth: { xs: '100%', sm: 220 },
                            borderRadius: '6px',
                            bgcolor: '#fff',
                            color: '#0f172a',
                            borderColor: '#cbd5e1',
                            '&:focus-within': {
                              outline: '2px solid #2563eb',
                              outlineOffset: '2px',
                            },
                            '& .MuiSelect-button': {
                              minHeight: 44,
                            },
                          }}
                        >
                          {profileVersions.map((version) => (
                            <Option key={version.version} value={version.version}>
                              {pickVersionLabel(version)}
                            </Option>
                          ))}
                        </Select>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 2,
              }}
            >
              {activeSections.map((section) => (
                <ScanSectionCard key={section.title} section={section} />
              ))}
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
