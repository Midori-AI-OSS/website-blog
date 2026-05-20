import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';

import {
  normalizeSpeciesCareSourceReference,
  parseSpeciesCareCardMarkdown,
  parseSpeciesCareProfileMarkdown,
  slugifySpeciesCareVersion,
} from '../lib/species-care/loader';
import type {
  SpeciesCareCardMetadata,
  SpeciesCareCardVersionMetadata,
  SpeciesCareProfileMetadata,
  SpeciesCareProfileVersionMetadata,
} from '../lib/species-care/types';

const SOURCE_REPO = process.argv[2] ?? '/tmp/dnd-notes';
const TARGET_DIR = join(process.cwd(), 'lore/species-cards');
const PROFILE_TARGET_DIR = join(process.cwd(), 'lore/species-care-profiles');
const REAL_MOMENTS_CHARS_DIR = join(SOURCE_REPO, 'campaigns/real-moments/chars');
const REAL_MOMENTS_MEDICAL_DIR = join(SOURCE_REPO, 'campaigns/real-moments/medical');

async function pathExists(path: string): Promise<boolean> {
  return Boolean(await stat(path).catch(() => null));
}

async function walkSpeciesCards(dir: string): Promise<string[]> {
  const output: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await walkSpeciesCards(path)));
      continue;
    }
    if (entry.isFile() && entry.name === 'species-card.md') output.push(path);
  }
  return output;
}

async function walkCareProfiles(dir: string): Promise<string[]> {
  const output: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await walkCareProfiles(path)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('care-profile.md')) output.push(path);
  }
  return output;
}

async function findRealMomentsSpeciesCards(): Promise<string[]> {
  const charEntries = await readdir(REAL_MOMENTS_CHARS_DIR, { withFileTypes: true });
  const cards: string[] = [];
  for (const entry of charEntries) {
    if (!entry.isDirectory()) continue;
    const itemsDir = join(REAL_MOMENTS_CHARS_DIR, entry.name, 'items');
    if (!(await pathExists(itemsDir))) continue;
    cards.push(...(await walkSpeciesCards(itemsDir)));
  }
  return cards.sort((a, b) => a.localeCompare(b));
}

async function findRealMomentsCareProfiles(): Promise<string[]> {
  if (!(await pathExists(REAL_MOMENTS_MEDICAL_DIR))) return [];
  return (await walkCareProfiles(REAL_MOMENTS_MEDICAL_DIR)).sort((a, b) => a.localeCompare(b));
}

async function readMetadata(path: string): Promise<SpeciesCareCardMetadata | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as SpeciesCareCardMetadata;
  } catch {
    return null;
  }
}

async function readProfileMetadata(path: string): Promise<SpeciesCareProfileMetadata | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as SpeciesCareProfileMetadata;
  } catch {
    return null;
  }
}

function uniqueVersions(
  versions: SpeciesCareCardVersionMetadata[],
): SpeciesCareCardVersionMetadata[] {
  const byVersion = new Map<string, SpeciesCareCardVersionMetadata>();
  for (const version of versions) byVersion.set(version.version, version);
  return Array.from(byVersion.values()).sort((a, b) => a.version.localeCompare(b.version));
}

function uniqueProfileVersions(
  versions: SpeciesCareProfileVersionMetadata[],
): SpeciesCareProfileVersionMetadata[] {
  const byVersion = new Map<string, SpeciesCareProfileVersionMetadata>();
  for (const version of versions) byVersion.set(version.version, version);
  return Array.from(byVersion.values()).sort((a, b) => a.version.localeCompare(b.version));
}

async function importCard(sourcePath: string): Promise<string> {
  const markdown = await readFile(sourcePath, 'utf-8');
  const parsed = parseSpeciesCareCardMarkdown(markdown);
  const version = slugifySpeciesCareVersion(parsed.profileVersion);
  const sourceHash = createHash('sha256').update(markdown).digest('hex');
  const slugDir = join(TARGET_DIR, parsed.slug);
  const versionsDir = join(slugDir, 'versions');
  const versionFilename = `versions/${version}.md`;
  const metadataPath = join(slugDir, 'metadata.json');
  const importedAt = new Date().toISOString();

  await mkdir(versionsDir, { recursive: true });
  await writeFile(join(slugDir, versionFilename), `${markdown.trimEnd()}\n`, 'utf-8');

  const existing = await readMetadata(metadataPath);
  const versionMetadata: SpeciesCareCardVersionMetadata = {
    version,
    profileVersion: parsed.profileVersion,
    filename: versionFilename,
    title: parsed.title,
    preferredName: parsed.summary.preferredName,
    species: parsed.summary.species,
    inWorldUri: parsed.summary.qrCode,
    sourcePath,
    sourceHash,
    importedAt,
  };
  const metadata: SpeciesCareCardMetadata = {
    slug: parsed.slug,
    title: parsed.title,
    currentVersion: version,
    versions: uniqueVersions([...(existing?.versions ?? []), versionMetadata]),
    updatedAt: importedAt,
  };

  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf-8');
  return `${parsed.slug}@${version} <- ${relative(SOURCE_REPO, sourcePath)}`;
}

async function importProfile(sourcePath: string): Promise<string> {
  const markdown = await readFile(sourcePath, 'utf-8');
  const parsed = parseSpeciesCareProfileMarkdown(markdown);
  const version = slugifySpeciesCareVersion(parsed.profileVersion);
  const sourceHash = createHash('sha256').update(markdown).digest('hex');
  const slugDir = join(PROFILE_TARGET_DIR, parsed.slug);
  const versionsDir = join(slugDir, 'versions');
  const versionFilename = `versions/${version}.md`;
  const metadataPath = join(slugDir, 'metadata.json');
  const importedAt = new Date().toISOString();
  const sourceRelativePath = normalizeSpeciesCareSourceReference(relative(SOURCE_REPO, sourcePath));

  await mkdir(versionsDir, { recursive: true });
  await writeFile(join(slugDir, versionFilename), `${markdown.trimEnd()}\n`, 'utf-8');

  const existing = await readProfileMetadata(metadataPath);
  const versionMetadata: SpeciesCareProfileVersionMetadata = {
    version,
    profileVersion: parsed.profileVersion,
    filename: versionFilename,
    title: parsed.title,
    designation: parsed.designation,
    profileId: parsed.profileId,
    sourcePath,
    sourceRelativePath,
    sourceHash,
    importedAt,
  };
  const metadata: SpeciesCareProfileMetadata = {
    slug: parsed.slug,
    title: parsed.title,
    currentVersion: version,
    versions: uniqueProfileVersions([...(existing?.versions ?? []), versionMetadata]),
    updatedAt: importedAt,
  };

  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf-8');
  return `${parsed.slug}@${version} <- ${sourceRelativePath}`;
}

async function main() {
  if (!(await pathExists(REAL_MOMENTS_CHARS_DIR))) {
    throw new Error(`Real Moments chars folder not found: ${REAL_MOMENTS_CHARS_DIR}`);
  }

  await mkdir(TARGET_DIR, { recursive: true });
  await mkdir(PROFILE_TARGET_DIR, { recursive: true });
  const cards = await findRealMomentsSpeciesCards();
  const profiles = await findRealMomentsCareProfiles();

  const imports: string[] = [];
  for (const card of cards) {
    if (basename(card) !== 'species-card.md') continue;
    imports.push(await importCard(card));
  }

  const profileImports: string[] = [];
  for (const profile of profiles) {
    if (!basename(profile).endsWith('care-profile.md')) continue;
    profileImports.push(await importProfile(profile));
  }

  if (imports.length === 0) {
    console.info(`No species-card.md files found under ${REAL_MOMENTS_CHARS_DIR}`);
  } else {
    console.info(`Imported ${imports.length} Real Moments species card(s):`);
    for (const entry of imports) console.info(`- ${entry}`);
  }

  if (profileImports.length === 0) {
    console.info(`No *care-profile.md files found under ${REAL_MOMENTS_MEDICAL_DIR}`);
  } else {
    console.info(`Imported ${profileImports.length} Real Moments care profile(s):`);
    for (const entry of profileImports) console.info(`- ${entry}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
