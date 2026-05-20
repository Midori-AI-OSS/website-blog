export type SpeciesCareCardVariant = 'healthcare-card' | 'protocol';

export interface SpeciesCareField {
  label: string;
  value: string;
}

export interface SpeciesCareScanSection {
  title: string;
  fields: SpeciesCareField[];
  body: string[];
  subsections: SpeciesCareScanSection[];
}

export interface SpeciesCareCardVersionMetadata {
  version: string;
  profileVersion: string;
  filename: string;
  title: string;
  preferredName: string;
  species: string;
  inWorldUri?: string;
  sourcePath?: string;
  sourceHash?: string;
  importedAt?: string;
}

export interface SpeciesCareCardMetadata {
  slug: string;
  title: string;
  currentVersion: string;
  versions: SpeciesCareCardVersionMetadata[];
  updatedAt?: string;
}

export interface SpeciesCareCardSummary {
  slug: string;
  title: string;
  variant: SpeciesCareCardVariant;
  version: string;
  profileVersion: string;
  legalName?: string;
  preferredName: string;
  initials: string;
  pronouns?: string;
  dobAge?: string;
  sex?: string;
  gender?: string;
  species: string;
  profileId?: string;
  subtypeStatus?: string;
  primaryCareFlag: string;
  identityCaution?: string;
  healthcareId: string;
  ehr?: string;
  emergencyContact?: string;
  advocateContact?: string;
  issuedBy?: string;
  registeredWith?: string;
  replacementRequest?: string;
  qrCode?: string;
  nfcTap?: string;
  fallbackLookupCode?: string;
  accessNote?: string;
  recordType: string;
  patientSignature?: string;
  criticalBanner: string;
  webScanPath: string;
}

export interface SpeciesCareBackSummary {
  escalate: string;
  doNotDismiss: string;
  firstAction: string;
  hardAvoids: string;
  medication: string;
  sedation: string;
  labs: string;
  imaging: string;
  sensory: string;
  handling: string;
  unknowns: string;
}

export interface SpeciesCareCardRecord {
  slug: string;
  title: string;
  variant: SpeciesCareCardVariant;
  version: string;
  profileVersion: string;
  metadata?: SpeciesCareCardMetadata;
  sourceFilename?: string;
  cardPurpose: Record<string, string>;
  identity: Record<string, string>;
  speciesProfile: Record<string, string>;
  issuance: Record<string, string>;
  healthcareLinks: Record<string, string>;
  scanAccess: Record<string, string>;
  topWarning: Record<string, string>;
  recordStatus: Record<string, string>;
  summary: SpeciesCareCardSummary;
  back: SpeciesCareBackSummary;
  scanTitle: string;
  scanSections: SpeciesCareScanSection[];
}

export interface SpeciesCareCardEmbedData {
  status: 'loaded' | 'error';
  token: string;
  record?: SpeciesCareCardRecord;
  availableVersions?: SpeciesCareCardVersionMetadata[];
  error?: string;
}

export type SpeciesCareCardEmbedMap = Record<string, SpeciesCareCardEmbedData>;
