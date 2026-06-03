import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { join, sep } from 'node:path';
import {
  extractSpeciesCareTokenRefs,
  isValidSpeciesCareSlug,
  isValidSpeciesCareVersion,
} from './tokens';
import type {
  SpeciesCareBackSummary,
  SpeciesCareCardEmbedMap,
  SpeciesCareCardMetadata,
  SpeciesCareCardRecord,
  SpeciesCareCardSummary,
  SpeciesCareCardVariant,
  SpeciesCareCardVersionMetadata,
  SpeciesCareField,
  SpeciesCareLinkedProfile,
  SpeciesCareProfileMetadata,
  SpeciesCareProfileRecord,
  SpeciesCareScanSection,
} from './types';

const SPECIES_CARDS_DIR = join(process.cwd(), 'lore/species-cards');
const SPECIES_PROFILES_DIR = join(process.cwd(), 'lore/species-care-profiles');

interface ParsedHeadingSection {
  title: string;
  level: number;
  fields: SpeciesCareField[];
  body: string[];
  children: ParsedHeadingSection[];
}

interface ParseOptions {
  slug?: string;
  version?: string;
  metadata?: SpeciesCareCardMetadata;
  sourceFilename?: string;
}

interface ProfileParseOptions {
  slug?: string;
  version?: string;
  metadata?: SpeciesCareProfileMetadata;
  sourceFilename?: string;
}

const REQUIRED_HEALTHCARE_PHYSICAL_SECTIONS = [
  'Patient Identity',
  'Species Profile',
  'Issuance',
  'Healthcare Links',
  'Scan Access',
];

const REQUIRED_HEALTHCARE_SCAN_SECTIONS = [
  'Record Status',
  'Quick Red Flags',
  'Pain Response',
  'Medication Dosing',
  'Sedation / Anesthesia',
  'Imaging Notes',
  'Handling / Mobility',
  'Communication Notes',
  'Magic Interactions',
  'Do Not Do',
  'Known Unknowns',
];

const REQUIRED_PROTOCOL_PHYSICAL_SECTIONS = [
  'Identity',
  'Species Profile',
  'Top Warning',
  'Issuance',
  'Healthcare Links',
  'Scan Access',
];

const REQUIRED_PROTOCOL_SCAN_SECTIONS = [
  'Record Status',
  'Trusted Contacts',
  'State Transitions',
  'Particle Monitoring',
  'Communication Protocol',
  'Containment and Hazards',
  'Do Not Do',
  'Known Unknowns',
];

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanInlineMarkdown(value: string): string {
  return value
    .trim()
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTrailingPeriod(value: string): string {
  return value.trim().replace(/\.$/, '');
}

const TRAILING_PERIOD_NORMALIZED_FIELD_LABELS = new Set([
  normalizeKey('Legal name'),
  normalizeKey('Preferred name'),
  normalizeKey('Legal / system name'),
  normalizeKey('Preferred / display name'),
  normalizeKey('Pronouns'),
  normalizeKey('DOB / age'),
  normalizeKey('Sex'),
  normalizeKey('Gender'),
]);

function normalizeSpeciesCareFieldValue(label: string, value: string): string {
  if (!TRAILING_PERIOD_NORMALIZED_FIELD_LABELS.has(normalizeKey(label))) return value;
  return stripTrailingPeriod(value);
}

export function slugifySpeciesCareValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugifySpeciesCareVersion(value: string | undefined): string {
  const slug = (value || 'unversioned')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unversioned';
}

export function normalizeSpeciesCareSourceReference(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/\.+$/g, '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

function sourceReferenceMatches(candidate: string | undefined, reference: string): boolean {
  const normalizedCandidate = normalizeSpeciesCareSourceReference(candidate);
  const normalizedReference = normalizeSpeciesCareSourceReference(reference);
  if (!normalizedCandidate || !normalizedReference) return false;
  return (
    normalizedCandidate === normalizedReference ||
    normalizedCandidate.endsWith(`/${normalizedReference}`) ||
    normalizedReference.endsWith(`/${normalizedCandidate}`)
  );
}

function getField(section: ParsedHeadingSection | undefined, labels: string[]): string | undefined {
  if (!section) return undefined;
  const targets = new Set(labels.map(normalizeKey));
  const field = section.fields.find((candidate) => targets.has(normalizeKey(candidate.label)));
  if (!field) return undefined;
  return normalizeSpeciesCareFieldValue(field.label, field.value);
}

function fieldsToRecord(section: ParsedHeadingSection | undefined): Record<string, string> {
  if (!section) return {};
  return Object.fromEntries(
    section.fields.map((field) => [
      field.label,
      normalizeSpeciesCareFieldValue(field.label, field.value),
    ]),
  );
}

function findSection(
  sections: ParsedHeadingSection[],
  title: string,
): ParsedHeadingSection | undefined {
  const normalized = normalizeKey(title);
  return sections.find((section) => normalizeKey(section.title) === normalized);
}

function requireSection(
  sections: ParsedHeadingSection[],
  title: string,
  context: string,
): ParsedHeadingSection {
  const section = findSection(sections, title);
  if (!section) throw new Error(`Species card is missing required ${context} section: ${title}`);
  return section;
}

function requireSections(sections: ParsedHeadingSection[], titles: string[], context: string) {
  for (const title of titles) {
    requireSection(sections, title, context);
  }
}

function parseHeadingMarkdown(markdown: string): ParsedHeadingSection[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const roots: ParsedHeadingSection[] = [];
  const stack: ParsedHeadingSection[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (headingMatch?.[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      const title = cleanInlineMarkdown(headingMatch[2]);
      const section: ParsedHeadingSection = {
        title,
        level,
        fields: [],
        body: [],
        children: [],
      };

      while (stack.length > 0 && (stack.at(-1)?.level ?? 0) >= level) stack.pop();
      const parent = stack.at(-1);
      if (parent) parent.children.push(section);
      else roots.push(section);
      stack.push(section);
      continue;
    }

    const current = stack.at(-1);
    if (!current) continue;

    const fieldMatch = line.match(/^\s*-\s+\*\*([^*]+?)\s*:\*\*\s*(.*)$/);
    if (fieldMatch?.[1]) {
      current.fields.push({
        label: cleanInlineMarkdown(fieldMatch[1]),
        value: cleanInlineMarkdown(fieldMatch[2] ?? ''),
      });
      continue;
    }

    const bulletMatch = line.match(/^\s*-\s+(.+)$/);
    if (bulletMatch?.[1]) {
      current.body.push(cleanInlineMarkdown(bulletMatch[1]));
      continue;
    }

    const trimmed = line.trim();
    if (trimmed) current.body.push(cleanInlineMarkdown(trimmed));
  }

  return roots;
}

function toScanSection(section: ParsedHeadingSection): SpeciesCareScanSection {
  return {
    title: section.title,
    fields: section.fields.map((field) => ({
      ...field,
      value: normalizeSpeciesCareFieldValue(field.label, field.value),
    })),
    body: section.body,
    subsections: section.children.map(toScanSection),
  };
}

function getInitials(value: string): string {
  const letters = value
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z]/g, '').charAt(0))
    .filter(Boolean)
    .join('');
  return (letters || 'SC').slice(0, 3).toUpperCase();
}

function getSlugDisplayName(value: string): string {
  const withoutExpansion = value.replace(/\s+\(.+\)\s*$/, '').trim();
  return withoutExpansion || value;
}

function getPreferredName(identity: ParsedHeadingSection): string | undefined {
  return getField(identity, ['Preferred name', 'Preferred / display name', 'Preferred']);
}

function getLegalName(identity: ParsedHeadingSection): string | undefined {
  return getField(identity, ['Legal name', 'Legal / system name']);
}

function getSpecies(speciesProfile: ParsedHeadingSection): string | undefined {
  return getField(speciesProfile, ['Species / designation', 'Species / profile code', 'Species']);
}

function getProfileId(speciesProfile: ParsedHeadingSection): string | undefined {
  return getField(speciesProfile, ['Species profile ID', 'Species / profile code', 'Profile code']);
}

function getProfileVersion(speciesProfile: ParsedHeadingSection): string | undefined {
  return getField(speciesProfile, ['Species profile version', 'Profile version']);
}

function getHealthcareId(healthcareLinks: ParsedHeadingSection): string | undefined {
  return getField(healthcareLinks, ['Healthcare system ID', 'Healthcare ID']);
}

function getPrimaryFlag(
  speciesProfile: ParsedHeadingSection,
  topWarning: ParsedHeadingSection | undefined,
): string | undefined {
  return (
    getField(speciesProfile, ['Primary care flag']) ??
    getField(topWarning, ['No human vitals or ordinary human anatomy']) ??
    topWarning?.fields[0]?.value ??
    topWarning?.body[0]
  );
}

function requireValue(value: string | undefined, label: string): string {
  if (!value?.trim()) throw new Error(`Species card is missing required field: ${label}`);
  return stripTrailingPeriod(value);
}

export function getSpeciesCareRoutePathFromInWorldUri(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\.+$/, '');
  if (!trimmed) return null;
  const match = trimmed.match(/^rm-health:\/\/(.+)$/i);
  if (!match?.[1]) return null;
  return match[1].replace(/^\/+|\/+$/g, '');
}

export function buildSpeciesCareWebScanPath(record: {
  slug: string;
  version?: string;
  scanAccess?: Record<string, string>;
}): string {
  const inWorldRoutePath = getSpeciesCareRoutePathFromInWorldUri(record.scanAccess?.['QR code']);
  const basePath = inWorldRoutePath
    ? `/species-care/${inWorldRoutePath}`
    : `/species-care/${record.slug}`;
  return record.version ? `${basePath}?version=${encodeURIComponent(record.version)}` : basePath;
}

function sectionField(
  sections: ParsedHeadingSection[],
  sectionTitle: string,
  labels: string[],
): string | undefined {
  return getField(findSection(sections, sectionTitle), labels);
}

function buildBackSummary(
  variant: SpeciesCareCardVariant,
  scanSections: ParsedHeadingSection[],
): SpeciesCareBackSummary {
  if (variant === 'protocol') {
    return {
      escalate:
        sectionField(scanSections, 'State Transitions', ['Worsening signs']) ??
        'Triage by state transition, communication status, and particle stability.',
      doNotDismiss:
        sectionField(scanSections, 'Particle Monitoring', ['Communication status']) ??
        'Do not apply human vital-sign assumptions to this protocol.',
      firstAction:
        sectionField(scanSections, 'Communication Protocol', [
          'Staff should answer aloud, by gesture, or by text',
        ]) ??
        'Use app/NFC prompts, ask short direct status questions, and contact trusted support.',
      hardAvoids:
        sectionField(scanSections, 'Do Not Do', ['Do not']) ??
        findSection(scanSections, 'Do Not Do')?.body.join(' ') ??
        'Do not improvise beyond the protocol.',
      medication:
        sectionField(scanSections, 'Particle Monitoring', [
          'Human meds, IVs, blood draws, CPR, pulse ox, ECG, and blood pressure',
        ]) ??
        'Human medication and vital protocols do not apply unless the protocol says otherwise.',
      sedation: 'Use protocol state checks instead of sedation/anesthesia assumptions.',
      labs:
        sectionField(scanSections, 'Containment and Hazards', [
          'Particle samples for lab analysis',
        ]) ?? 'Do not take samples without explicit consent.',
      imaging: 'No standard imaging protocol documented for the local swarm.',
      sensory:
        sectionField(scanSections, 'Environment', ['Environment']) ??
        'Keep contained/stable particles in a dry, quiet, low-airflow area.',
      handling:
        sectionField(scanSections, 'Containment and Hazards', ['Dry containment']) ??
        'Use dry containment and protect particles from airflow, drains, liquids, and disposal.',
      unknowns:
        findSection(scanSections, 'Known Unknowns')?.body.join(' ') ??
        sectionField(scanSections, 'Known Unknowns', ['Known Unknowns']) ??
        'Use documented protocol and registry support for unknowns.',
    };
  }

  return {
    escalate: requireValue(
      sectionField(scanSections, 'Quick Red Flags', ['Immediate escalation signs']),
      'Quick Red Flags > Immediate escalation signs',
    ),
    doNotDismiss: requireValue(
      sectionField(scanSections, 'Quick Red Flags', ['Do not dismiss as normal']),
      'Quick Red Flags > Do not dismiss as normal',
    ),
    firstAction: requireValue(
      sectionField(scanSections, 'Quick Red Flags', ['Fastest safe response']),
      'Quick Red Flags > Fastest safe response',
    ),
    hardAvoids:
      sectionField(scanSections, 'Do Not Do', ['Hard avoid list']) ??
      findSection(scanSections, 'Do Not Do')?.body.join(' ') ??
      'Use the scanned healthcare record and do not rely on assumptions.',
    medication:
      sectionField(scanSections, 'Medication Dosing', ['Dosing considerations']) ??
      'Use linked EHR and card guidance for medication decisions.',
    sedation:
      sectionField(scanSections, 'Sedation / Anesthesia', [
        'Sedation response',
        'Anesthesia cautions',
      ]) ?? 'Use linked EHR and card guidance for sedation/anesthesia decisions.',
    labs:
      sectionField(scanSections, 'Labs / Samples', ['Sample handling', 'Lab interpretation']) ??
      'Use ordinary lab handling unless the EHR says otherwise.',
    imaging:
      sectionField(scanSections, 'Imaging Notes', ['Imaging priority']) ??
      'Image according to mechanism, exam, and function concerns.',
    sensory:
      sectionField(scanSections, 'Sensory Environment', ['Light', 'Sound', 'Touch / proximity']) ??
      'Use patient-specific sensory guidance from the scanned record.',
    handling:
      sectionField(scanSections, 'Handling / Mobility', ['Safe movement']) ??
      'Use patient-specific handling and mobility guidance.',
    unknowns:
      sectionField(scanSections, 'Known Unknowns', ['Not documented', 'Use caution with']) ??
      'Use conservative assumptions and update records after the encounter.',
  };
}

function buildCriticalBanner(
  variant: SpeciesCareCardVariant,
  primaryFlag: string,
  back: SpeciesCareBackSummary,
): string {
  if (variant === 'protocol') return primaryFlag;
  return `${back.escalate} ${back.doNotDismiss}`.trim();
}

export function parseSpeciesCareCardMarkdown(
  markdown: string,
  options: ParseOptions = {},
): SpeciesCareCardRecord {
  const roots = parseHeadingMarkdown(markdown);
  const titleSection = roots.find((section) => section.level === 1);
  if (!titleSection) throw new Error('Species card is missing required H1 title.');

  const cardPurpose = requireSection(titleSection.children, 'Card Purpose', 'top-level');
  const physical = requireSection(titleSection.children, 'Physical Card Face', 'top-level');
  const healthcareScan = findSection(titleSection.children, 'Scanned Healthcare Record');
  const protocolScan = findSection(titleSection.children, 'Scanned Protocol');
  const variant: SpeciesCareCardVariant = protocolScan ? 'protocol' : 'healthcare-card';
  const scanRoot = protocolScan ?? healthcareScan;
  if (!scanRoot) {
    throw new Error(
      'Species card is missing required top-level section: Scanned Healthcare Record or Scanned Protocol',
    );
  }

  if (variant === 'protocol') {
    requireSections(physical.children, REQUIRED_PROTOCOL_PHYSICAL_SECTIONS, 'Physical Card Face');
    requireSections(scanRoot.children, REQUIRED_PROTOCOL_SCAN_SECTIONS, 'Scanned Protocol');
  } else {
    requireSections(physical.children, REQUIRED_HEALTHCARE_PHYSICAL_SECTIONS, 'Physical Card Face');
    requireSections(
      scanRoot.children,
      REQUIRED_HEALTHCARE_SCAN_SECTIONS,
      'Scanned Healthcare Record',
    );
  }

  const identity = requireSection(
    physical.children,
    variant === 'protocol' ? 'Identity' : 'Patient Identity',
    'Physical Card Face',
  );
  const speciesProfile = requireSection(physical.children, 'Species Profile', 'Physical Card Face');
  const issuance = requireSection(physical.children, 'Issuance', 'Physical Card Face');
  const healthcareLinks = requireSection(
    physical.children,
    'Healthcare Links',
    'Physical Card Face',
  );
  const scanAccess = requireSection(physical.children, 'Scan Access', 'Physical Card Face');
  const topWarning = findSection(physical.children, 'Top Warning');
  const recordStatus = requireSection(scanRoot.children, 'Record Status', scanRoot.title);

  const preferredName = requireValue(getPreferredName(identity), 'Preferred name');
  const legalName = getLegalName(identity);
  const species = requireValue(getSpecies(speciesProfile), 'Species / designation');
  const healthcareId = requireValue(getHealthcareId(healthcareLinks), 'Healthcare system ID');
  const profileVersion = requireValue(getProfileVersion(speciesProfile), 'Species profile version');
  const version = options.version ?? slugifySpeciesCareVersion(profileVersion);
  const slug = options.slug ?? slugifySpeciesCareValue(getSlugDisplayName(preferredName));
  if (!isValidSpeciesCareSlug(slug)) throw new Error(`Invalid species card slug: ${slug}`);
  if (!isValidSpeciesCareVersion(version))
    throw new Error(`Invalid species card version: ${version}`);

  const primaryCareFlag = requireValue(
    getPrimaryFlag(speciesProfile, topWarning),
    variant === 'protocol' ? 'Top Warning' : 'Primary care flag',
  );
  const scanAccessRecord = fieldsToRecord(scanAccess);
  const back = buildBackSummary(variant, scanRoot.children);
  const webScanPath = buildSpeciesCareWebScanPath({ slug, version, scanAccess: scanAccessRecord });

  const summary: SpeciesCareCardSummary = {
    slug,
    title: titleSection.title,
    variant,
    version,
    profileVersion,
    legalName: legalName ? stripTrailingPeriod(legalName) : undefined,
    preferredName,
    initials: getInitials(preferredName),
    pronouns: getField(identity, ['Pronouns']),
    dobAge: getField(identity, ['DOB / age', 'Chassis activation', 'Local swarm form']),
    sex: getField(identity, ['Sex']),
    gender: getField(identity, ['Gender']),
    species,
    profileId: getProfileId(speciesProfile),
    subtypeStatus: getField(speciesProfile, ['Subtype status', 'Registry model']),
    primaryCareFlag,
    identityCaution: getField(identity, ['Identity caution']),
    healthcareId: stripTrailingPeriod(healthcareId),
    ehr: getField(healthcareLinks, ['Auto-linked EHR']),
    emergencyContact: getField(healthcareLinks, ['Emergency contact']),
    advocateContact: getField(healthcareLinks, ['Advocate contact', 'Registry anchors']),
    issuedBy: getField(issuance, ['Issued by']),
    registeredWith: getField(issuance, ['Registered with']),
    replacementRequest: getField(issuance, ['Replacement / update request']),
    qrCode: getField(scanAccess, ['QR code'])
      ? stripTrailingPeriod(getField(scanAccess, ['QR code']) ?? '')
      : undefined,
    nfcTap: getField(scanAccess, ['NFC tap']),
    fallbackLookupCode: getField(scanAccess, ['Fallback lookup code'])
      ? stripTrailingPeriod(getField(scanAccess, ['Fallback lookup code']) ?? '')
      : undefined,
    accessNote: getField(scanAccess, ['Access note', 'App access']),
    recordType: requireValue(
      getField(recordStatus, ['Record type']),
      'Record Status > Record type',
    ),
    patientSignature: getField(recordStatus, ['Patient signature']),
    criticalBanner: buildCriticalBanner(variant, primaryCareFlag, back),
    webScanPath,
  };

  return {
    slug,
    title: titleSection.title,
    variant,
    version,
    profileVersion,
    metadata: options.metadata,
    sourceFilename: options.sourceFilename,
    cardPurpose: fieldsToRecord(cardPurpose),
    identity: fieldsToRecord(identity),
    speciesProfile: fieldsToRecord(speciesProfile),
    issuance: fieldsToRecord(issuance),
    healthcareLinks: fieldsToRecord(healthcareLinks),
    scanAccess: scanAccessRecord,
    topWarning: fieldsToRecord(topWarning),
    recordStatus: fieldsToRecord(recordStatus),
    summary,
    back,
    scanTitle: scanRoot.title,
    scanSections: scanRoot.children.map(toScanSection),
  };
}

export function getLinkedSpeciesCareProfileSource(
  record: SpeciesCareCardRecord,
): string | undefined {
  const entry = Object.entries(record.recordStatus).find(
    ([label]) => normalizeKey(label) === normalizeKey('Shared care profile'),
  );
  return entry?.[1] ? normalizeSpeciesCareSourceReference(entry[1]) : undefined;
}

export function parseSpeciesCareProfileMarkdown(
  markdown: string,
  options: ProfileParseOptions = {},
): SpeciesCareProfileRecord {
  const roots = parseHeadingMarkdown(markdown);
  const titleSection = roots.find((section) => section.level === 1);
  if (!titleSection) throw new Error('Species care profile is missing required H1 title.');

  const scope = requireSection(titleSection.children, 'Scope', 'top-level');
  const designation = requireValue(
    getField(scope, ['Designation', 'Species / designation']),
    'Scope > Designation',
  );
  const profileVersion = requireValue(
    getField(scope, ['Profile version', 'Species profile version']),
    'Scope > Profile version',
  );
  const profileId = getField(scope, ['Species/profile ID', 'Species profile ID', 'Profile ID']);
  const version = options.version ?? slugifySpeciesCareVersion(profileVersion);
  const slug = options.slug ?? slugifySpeciesCareValue(designation);
  if (!isValidSpeciesCareSlug(slug)) throw new Error(`Invalid species profile slug: ${slug}`);
  if (!isValidSpeciesCareVersion(version))
    throw new Error(`Invalid species profile version: ${version}`);

  const sections = titleSection.children
    .filter((section) => normalizeKey(section.title) !== normalizeKey('Scope'))
    .map(toScanSection);

  return {
    slug,
    title: titleSection.title,
    version,
    profileVersion,
    designation,
    profileId: profileId ? stripTrailingPeriod(profileId) : undefined,
    metadata: options.metadata,
    sourceFilename: options.sourceFilename,
    scope: fieldsToRecord(scope),
    sections,
  };
}

function isSafeRealPath(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

export async function loadSpeciesCareCardMetadataList(
  cardsDir: string = SPECIES_CARDS_DIR,
): Promise<SpeciesCareCardMetadata[]> {
  try {
    const dirStat = await stat(cardsDir).catch(() => null);
    if (!dirStat?.isDirectory()) return [];
    const realCardsDir = await realpath(cardsDir);
    const entries = await readdir(cardsDir, { withFileTypes: true });
    const metadata: SpeciesCareCardMetadata[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || !isValidSpeciesCareSlug(entry.name)) continue;
      const metadataPath = join(cardsDir, entry.name, 'metadata.json');
      const realMetadataPath = await realpath(metadataPath).catch(() => null);
      if (!realMetadataPath || !isSafeRealPath(realMetadataPath, realCardsDir)) continue;
      const parsed = await readJsonFile<SpeciesCareCardMetadata>(metadataPath);
      if (!parsed || parsed.slug !== entry.name || !isValidSpeciesCareSlug(parsed.slug)) continue;
      if (!isValidSpeciesCareVersion(parsed.currentVersion)) continue;
      metadata.push(parsed);
    }

    return metadata.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error('Error loading species care metadata:', error);
    return [];
  }
}

export async function loadSpeciesCareCard(
  slug: string,
  options: { version?: string; cardsDir?: string } = {},
): Promise<SpeciesCareCardRecord | null> {
  if (!isValidSpeciesCareSlug(slug)) return null;
  if (options.version && !isValidSpeciesCareVersion(options.version)) return null;

  const cardsDir = options.cardsDir ?? SPECIES_CARDS_DIR;
  const realCardsDir = await realpath(cardsDir).catch(() => null);
  if (!realCardsDir) return null;

  const metadataPath = join(cardsDir, slug, 'metadata.json');
  const realMetadataPath = await realpath(metadataPath).catch(() => null);
  if (!realMetadataPath || !isSafeRealPath(realMetadataPath, realCardsDir)) return null;

  const metadata = await readJsonFile<SpeciesCareCardMetadata>(metadataPath);
  if (!metadata || metadata.slug !== slug) return null;

  const version = options.version ?? metadata.currentVersion;
  if (!isValidSpeciesCareVersion(version)) return null;
  const versionMetadata = metadata.versions.find((entry) => entry.version === version);
  if (!versionMetadata) return null;

  const cardPath = join(cardsDir, slug, versionMetadata.filename);
  const realCardPath = await realpath(cardPath).catch(() => null);
  if (!realCardPath || !isSafeRealPath(realCardPath, realCardsDir)) return null;

  const markdown = await readFile(cardPath, 'utf-8');
  return parseSpeciesCareCardMarkdown(markdown, {
    slug,
    version,
    metadata,
    sourceFilename: versionMetadata.filename,
  });
}

export async function loadSpeciesCareProfileMetadataList(
  profilesDir: string = SPECIES_PROFILES_DIR,
): Promise<SpeciesCareProfileMetadata[]> {
  try {
    const dirStat = await stat(profilesDir).catch(() => null);
    if (!dirStat?.isDirectory()) return [];
    const realProfilesDir = await realpath(profilesDir);
    const entries = await readdir(profilesDir, { withFileTypes: true });
    const metadata: SpeciesCareProfileMetadata[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || !isValidSpeciesCareSlug(entry.name)) continue;
      const metadataPath = join(profilesDir, entry.name, 'metadata.json');
      const realMetadataPath = await realpath(metadataPath).catch(() => null);
      if (!realMetadataPath || !isSafeRealPath(realMetadataPath, realProfilesDir)) continue;
      const parsed = await readJsonFile<SpeciesCareProfileMetadata>(metadataPath);
      if (!parsed || parsed.slug !== entry.name || !isValidSpeciesCareSlug(parsed.slug)) continue;
      if (!isValidSpeciesCareVersion(parsed.currentVersion)) continue;
      metadata.push(parsed);
    }

    return metadata.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error('Error loading species care profile metadata:', error);
    return [];
  }
}

export async function loadSpeciesCareProfile(
  slug: string,
  options: { version?: string; profilesDir?: string } = {},
): Promise<SpeciesCareProfileRecord | null> {
  if (!isValidSpeciesCareSlug(slug)) return null;
  if (options.version && !isValidSpeciesCareVersion(options.version)) return null;

  const profilesDir = options.profilesDir ?? SPECIES_PROFILES_DIR;
  const realProfilesDir = await realpath(profilesDir).catch(() => null);
  if (!realProfilesDir) return null;

  const metadataPath = join(profilesDir, slug, 'metadata.json');
  const realMetadataPath = await realpath(metadataPath).catch(() => null);
  if (!realMetadataPath || !isSafeRealPath(realMetadataPath, realProfilesDir)) return null;

  const metadata = await readJsonFile<SpeciesCareProfileMetadata>(metadataPath);
  if (!metadata || metadata.slug !== slug) return null;

  const version = options.version ?? metadata.currentVersion;
  if (!isValidSpeciesCareVersion(version)) return null;
  const versionMetadata = metadata.versions.find((entry) => entry.version === version);
  if (!versionMetadata) return null;

  const profilePath = join(profilesDir, slug, versionMetadata.filename);
  const realProfilePath = await realpath(profilePath).catch(() => null);
  if (!realProfilePath || !isSafeRealPath(realProfilePath, realProfilesDir)) return null;

  const markdown = await readFile(profilePath, 'utf-8');
  return parseSpeciesCareProfileMarkdown(markdown, {
    slug,
    version,
    metadata,
    sourceFilename: versionMetadata.filename,
  });
}

export async function loadLinkedSpeciesCareProfile(
  sourceReference: string | undefined,
  options: { version?: string; profilesDir?: string } = {},
): Promise<SpeciesCareLinkedProfile | null> {
  const normalizedReference = normalizeSpeciesCareSourceReference(sourceReference);
  if (!normalizedReference) return null;
  if (options.version && !isValidSpeciesCareVersion(options.version)) return null;

  const profilesDir = options.profilesDir ?? SPECIES_PROFILES_DIR;
  const metadataList = await loadSpeciesCareProfileMetadataList(profilesDir);

  for (const metadata of metadataList) {
    const versionCandidates = options.version
      ? metadata.versions.filter((entry) => entry.version === options.version)
      : metadata.versions;
    const matches = versionCandidates.some(
      (entry) =>
        sourceReferenceMatches(entry.sourceRelativePath, normalizedReference) ||
        sourceReferenceMatches(entry.sourcePath, normalizedReference),
    );
    if (!matches) continue;

    const record = await loadSpeciesCareProfile(metadata.slug, {
      version: options.version,
      profilesDir,
    });
    if (!record) return null;
    return {
      record,
      availableVersions: metadata.versions,
      sourceReference: normalizedReference,
    };
  }

  return null;
}

export async function loadSpeciesCareCardsForMarkdown(
  markdown: string,
  cardsDir: string = SPECIES_CARDS_DIR,
): Promise<SpeciesCareCardEmbedMap> {
  const refs = extractSpeciesCareTokenRefs(markdown);
  const output: SpeciesCareCardEmbedMap = {};
  const metadataList = await loadSpeciesCareCardMetadataList(cardsDir);
  const metadataBySlug = new Map(metadataList.map((metadata) => [metadata.slug, metadata]));

  for (const ref of refs) {
    const metadata = metadataBySlug.get(ref.slug);
    const record = await loadSpeciesCareCard(ref.slug, { version: ref.version, cardsDir });
    if (!record) {
      output[ref.key] = {
        status: 'error',
        token: ref.raw,
        error: `Species care card not found for ${ref.key}.`,
      };
      continue;
    }

    output[ref.key] = {
      status: 'loaded',
      token: ref.raw,
      record,
      availableVersions: metadata?.versions ?? record.metadata?.versions ?? [],
    };
  }

  return output;
}

function inWorldUriToRoutePath(value: string | undefined): string | null {
  return getSpeciesCareRoutePathFromInWorldUri(value);
}

export async function loadSpeciesCareCardByRoutePath(
  pathSegments: string[],
  options: {
    version?: string;
    profileVersion?: string;
    cardsDir?: string;
    profilesDir?: string;
  } = {},
): Promise<{
  record: SpeciesCareCardRecord;
  availableVersions: SpeciesCareCardVersionMetadata[];
  linkedProfile?: SpeciesCareLinkedProfile;
} | null> {
  const normalizedSegments = pathSegments.map((segment) => segment.trim()).filter(Boolean);
  if (normalizedSegments.length === 0) return null;
  const routePath = normalizedSegments.join('/');
  const cardsDir = options.cardsDir ?? SPECIES_CARDS_DIR;

  if (normalizedSegments.length === 1 && isValidSpeciesCareSlug(normalizedSegments[0] ?? '')) {
    const slug = normalizedSegments[0] ?? '';
    const metadataList = await loadSpeciesCareCardMetadataList(cardsDir);
    const metadata = metadataList.find((entry) => entry.slug === slug);
    const record = await loadSpeciesCareCard(slug, { version: options.version, cardsDir });
    if (!record) return null;
    const linkedProfile =
      record.variant === 'healthcare-card'
        ? await loadLinkedSpeciesCareProfile(getLinkedSpeciesCareProfileSource(record), {
            version: options.profileVersion,
            profilesDir: options.profilesDir,
          })
        : null;
    return {
      record,
      availableVersions: metadata?.versions ?? record.metadata?.versions ?? [],
      linkedProfile: linkedProfile ?? undefined,
    };
  }

  const metadataList = await loadSpeciesCareCardMetadataList(cardsDir);
  for (const metadata of metadataList) {
    const versionCandidates = options.version
      ? metadata.versions.filter((entry) => entry.version === options.version)
      : metadata.versions;
    const matches = versionCandidates.some(
      (entry) => inWorldUriToRoutePath(entry.inWorldUri) === routePath,
    );
    if (!matches) continue;
    const record = await loadSpeciesCareCard(metadata.slug, {
      version: options.version,
      cardsDir,
    });
    if (!record) return null;
    const linkedProfile =
      record.variant === 'healthcare-card'
        ? await loadLinkedSpeciesCareProfile(getLinkedSpeciesCareProfileSource(record), {
            version: options.profileVersion,
            profilesDir: options.profilesDir,
          })
        : null;
    return {
      record,
      availableVersions: metadata.versions,
      linkedProfile: linkedProfile ?? undefined,
    };
  }

  return null;
}

export async function getSpeciesCareStaticRouteParams(
  cardsDir: string = SPECIES_CARDS_DIR,
): Promise<Array<{ path: string[] }>> {
  const metadataList = await loadSpeciesCareCardMetadataList(cardsDir);
  const params: Array<{ path: string[] }> = [];
  for (const metadata of metadataList) {
    params.push({ path: [metadata.slug] });
    const current = metadata.versions.find((entry) => entry.version === metadata.currentVersion);
    const routePath = inWorldUriToRoutePath(current?.inWorldUri);
    if (routePath) params.push({ path: routePath.split('/') });
  }
  return params;
}
