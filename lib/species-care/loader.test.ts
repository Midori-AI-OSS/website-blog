import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  getLinkedSpeciesCareProfileSource,
  loadLinkedSpeciesCareProfile,
  loadSpeciesCareCard,
  loadSpeciesCareCardByRoutePath,
  loadSpeciesCareCardsForMarkdown,
  parseSpeciesCareCardMarkdown,
  parseSpeciesCareProfileMarkdown,
} from './loader';

let testRootDir = '';
let testCardsDir = '';
let testProfilesDir = '';

const healthcareCard = `# Luna Midori Species Card

## Card Purpose

- **Document type:** Species-level healthcare card with Luna-specific notes.
- **Use case:** ER and EMS.
- **Scope warning:** This card is public worldbuilding.
- **Staff instruction:** Scan the QR code.

## Physical Card Face

### Patient Identity

- **Legal name:** Luna Midori.
- **Preferred name:** Luna Midori.
- **Pronouns:** she/her.
- **DOB / age:** 01/21; late 20s.
- **Sex:** Female.
- **Gender:** Female.
- **Identity caution:** Verify by card/name.

### Species Profile

- **Species / designation:** Luminumbra Aasimar-touched.
- **Species profile ID:** \`AAS-TCH-LUMINUMBRA-PROV\`.
- **Species profile version:** \`PROV v0.15\`.
- **Subtype status:** Provisional.
- **Primary care flag:** Pain may understate injury severity; assess structure/function first.

### Issuance

- **Issued by:** High school screening.
- **Registered with:** DHS Care Registry.
- **Replacement / update request:** Use DHS Care Registry lookup.

### Healthcare Links

- **Healthcare system ID:** \`MRN-AR-SAPPORO-MIDORI-LUNA-0121\`.
- **Auto-linked EHR:** DHS Care Registry.
- **Emergency contact:** Midori family.
- **Advocate contact:** Contact Leo when clinically relevant.

### Scan Access

- **QR code:** \`rm-health://species-card/ar/sapporo/midori/luna/0121/aas-tch-luminumbra-prov\`.
- **NFC tap:** Active.
- **Fallback lookup code:** \`DHS-AR-SAPPORO-MIDORI-LUNA-0121-AAS-TCH-LUMINUMBRA-PROV\`.
- **Access note:** Emergency staff may use registry lookup.

## Scanned Healthcare Record

### Record Status

- **Record type:** Species-level care guidance with Luna-specific clinical notes.
- **Shared care profile:** \`campaigns/real-moments/medical/luminumbra-care-profile.md\`.
- **Patient-specific records:** DHS Care Registry.
- **Patient signature:** Not documented.

### Quick Red Flags

- **Immediate escalation signs:** Low pain with failed mobility.
- **Do not dismiss as normal:** Do not rely on \`I'm fine\`.
- **Fastest safe response:** Ask function questions first.

### Baseline Vitals

- **Expected baseline:** Mostly human baseline.

### Pain Response

- **Pain expression:** Pain may be softened.

### Medication Dosing

- **Dosing considerations:** Use lower-start dosing.

### Sedation / Anesthesia

- **Sedation response:** Use shared guidance.
- **Anesthesia cautions:** Do not escalate only to force pain report.

### Allergies / Contraindications

- **Unknowns:** No Luna-specific allergies documented.

### Labs / Samples

- **Sample handling:** Human baseline.

### Imaging Notes

- **Imaging priority:** Image based on mechanism and function loss.

### Wounds / Healing

- **Bleeding:** The pain reflex does not stop bleeding.

### Monitoring Devices

- **Pulse ox / ECG / vitals:** Standard devices are reliable.

### Sensory Environment

- **Light:** Human baseline.

### Handling / Mobility

- **Safe movement:** Stabilize and move as a human patient.

### Communication Notes

- **Reliable communication:** Normal communication.

### Magic Interactions

- **Active magic signs:** Halo and eye glow may appear.

### Inpatient Care

- **Observation:** Standard observation.

### Discharge / Recovery

- **Return precautions:** Return for weakness or collapse.

### Do Not Do

- **Hard avoid list:** Do not trust low pain as proof of low injury severity.

### Known Unknowns

- **Not documented:** No additional known unknowns beyond provisional subtype status.
`;

const luminumbraProfile = `# Luminumbra Care Profile

## Scope

- **Designation:** \`Luminumbra Aasimar-touched\`.
- **Classification status:** Provisional subtype.
- **Species/profile ID:** \`Luminumbra Aasimar-touched / AAS-TCH-LUMINUMBRA-PROV\`.
- **Profile version:** \`PROV v0.12\`.
- **Use:** Shared care reference for Luminumbra Aasimar-touched patient species cards.
- **Primary care flag:** Pain may understate injury severity.

## Immediate Triage Flags

- Low reported pain is not proof of low injury severity.
- Body function changes are high-priority escalation signs.

## Pain Response

- \`Lenimen Caelesta\` is an involuntary, self-only pain-softening reflex.

## Medication And Anesthesia

- Use lower-start dosing and titration where clinically appropriate.
`;

const protocolCard = `# L.U.N.A. (W.E.A.V.E.) Protocol

## Card Purpose

- **Document type:** Nonhuman emergency protocol.
- **Use case:** ER.
- **Scope warning:** Protocol for local swarm.
- **Staff instruction:** Scan the QR code.

## Physical Card Face

### Identity

- **Legal / system name:** L.U.N.A. (Logical Universal Nimble Assistant).
- **Preferred / display name:** W.E.A.V.E.
- **Pronouns:** it/its.
- **Nature:** Bismuth-particle swarm; not a solid humanoid body.

### Species Profile

- **Species / profile code:** \`SYLV-LOGIC-PROV\`.
- **Profile version:** \`PROV v0.16\`.
- **Registry model:** DHS Care Registry entry linked to a nonhuman profile.

### Top Warning

- **No human vitals or ordinary human anatomy:** Human meds, IVs, blood draws, CPR, pulse ox, ECG, and blood pressure are not useful or applicable to the swarm.
- **Communication and status must be checked through Mind Link, app, or NFC rather than speech or vitals.**

### Issuance

- **Issued by:** DHS request.
- **Registered with:** DHS Care Registry.
- **Replacement / update request:** Use DHS Care Registry lookup.

### Healthcare Links

- **Healthcare system ID:** \`MRN-AR-DE-DUISBURG-SYLV-LOGIC-WEAVE\`.
- **Auto-linked EHR:** DHS Care Registry.
- **Emergency contact:** Contact any available main-party member.

### Scan Access

- **QR code:** \`rm-health://species-card/ar/de/duisburg/sylvomech/luna/weave/sylv-logic-prov\`.
- **NFC tap:** Active.
- **Fallback lookup code:** \`DHS-AR-DE-DUISBURG-SYLV-LOGIC-WEAVE-SYLV-LOGIC-PROV\`.
- **App access:** App can pull up this protocol.

## Scanned Protocol

### Record Status

- **Record type:** Nonhuman emergency protocol.
- **Patient-specific records:** DHS Care Registry.

### Trusted Contacts

- **Main-party contacts:** Riley, Echo, Luna, and Leo.
- **Contact any available main-party member; no strict order is encoded.**

### State Transitions

Triage by state, not by human vital signs.

#### Full Mode

- W.E.A.V.E. is visible, active, and able to communicate.

#### Kernel Panic

- **Worsening signs:** Communication loss; particle scatter or loss of cohesion.

### Particle Monitoring

- **Particle state:** Cohesion, scatter, spin speed, brightness, and color stability.
- **Communication status:** Mind Link / app / NFC response.

### Communication Protocol

- Use short direct prompts: status, consent, mode, safe contact, support contact.

### Layer Protocol

- Use app-guided prompts.

### Containment and Hazards

- **Dry containment:** Use clean dry containment.
- **Particle samples for lab analysis:** Require explicit consent.

### Healing and Magic Boundaries

- W.E.A.V.E. manages its own healing boundaries.

### Environment

- Keep W.E.A.V.E. in a dry, quiet, low-airflow area.

### Release Conditions

- Safe release requires stable particles.

### Do Not Do

- **Do not** apply human vitals, labs, or medication protocols to the swarm.

### Known Unknowns

- Human medication, lab, and vital protocols do not apply.
`;

async function writeImportedCard(markdown: string) {
  const parsed = parseSpeciesCareCardMarkdown(markdown);
  const slugDir = join(testCardsDir, parsed.slug);
  await mkdir(join(slugDir, 'versions'), { recursive: true });
  await writeFile(join(slugDir, `versions/${parsed.version}.md`), markdown, 'utf-8');
  await writeFile(
    join(slugDir, 'metadata.json'),
    JSON.stringify(
      {
        slug: parsed.slug,
        title: parsed.title,
        currentVersion: parsed.version,
        versions: [
          {
            version: parsed.version,
            profileVersion: parsed.profileVersion,
            filename: `versions/${parsed.version}.md`,
            title: parsed.title,
            preferredName: parsed.summary.preferredName,
            species: parsed.summary.species,
            inWorldUri: parsed.summary.qrCode,
          },
        ],
      },
      null,
      2,
    ),
    'utf-8',
  );
  return parsed;
}

async function writeImportedProfile(
  markdown: string,
  sourceRelativePath = 'campaigns/real-moments/medical/luminumbra-care-profile.md',
) {
  const parsed = parseSpeciesCareProfileMarkdown(markdown);
  const slugDir = join(testProfilesDir, parsed.slug);
  await mkdir(join(slugDir, 'versions'), { recursive: true });
  await writeFile(join(slugDir, `versions/${parsed.version}.md`), markdown, 'utf-8');
  await writeFile(
    join(slugDir, 'metadata.json'),
    JSON.stringify(
      {
        slug: parsed.slug,
        title: parsed.title,
        currentVersion: parsed.version,
        versions: [
          {
            version: parsed.version,
            profileVersion: parsed.profileVersion,
            filename: `versions/${parsed.version}.md`,
            title: parsed.title,
            designation: parsed.designation,
            profileId: parsed.profileId,
            sourceRelativePath,
          },
        ],
      },
      null,
      2,
    ),
    'utf-8',
  );
  return parsed;
}

describe('Species care loader', () => {
  beforeEach(async () => {
    testRootDir = await mkdtemp(join(tmpdir(), 'species-care-'));
    testCardsDir = join(testRootDir, 'lore/species-cards');
    testProfilesDir = join(testRootDir, 'lore/species-care-profiles');
    await mkdir(testCardsDir, { recursive: true });
    await mkdir(testProfilesDir, { recursive: true });
  });

  afterEach(async () => {
    if (testRootDir) await rm(testRootDir, { recursive: true, force: true });
  });

  test('parses strict Real Moments healthcare card schema', () => {
    const parsed = parseSpeciesCareCardMarkdown(healthcareCard);

    expect(parsed.slug).toBe('luna-midori');
    expect(parsed.version).toBe('prov-v0.15');
    expect(parsed.variant).toBe('healthcare-card');
    expect(parsed.summary.legalName).toBe('Luna Midori');
    expect(parsed.summary.preferredName).toBe('Luna Midori');
    expect(parsed.summary.pronouns).toBe('she/her');
    expect(parsed.summary.dobAge).toBe('01/21; late 20s');
    expect(parsed.summary.sex).toBe('Female');
    expect(parsed.summary.gender).toBe('Female');
    expect(parsed.identity['Legal name']).toBe('Luna Midori');
    expect(parsed.identity['Preferred name']).toBe('Luna Midori');
    expect(parsed.identity.Pronouns).toBe('she/her');
    expect(parsed.identity['DOB / age']).toBe('01/21; late 20s');
    expect(parsed.identity.Sex).toBe('Female');
    expect(parsed.identity.Gender).toBe('Female');
    expect(parsed.identity['Identity caution']).toBe('Verify by card/name.');
    expect(parsed.summary.webScanPath).toBe(
      '/species-care/species-card/ar/sapporo/midori/luna/0121/aas-tch-luminumbra-prov?version=prov-v0.15',
    );
    expect(parsed.back.escalate).toBe('Low pain with failed mobility');
    expect(getLinkedSpeciesCareProfileSource(parsed)).toBe(
      'campaigns/real-moments/medical/luminumbra-care-profile.md',
    );
  });

  test('parses shared species care profile schema', () => {
    const parsed = parseSpeciesCareProfileMarkdown(luminumbraProfile);

    expect(parsed.slug).toBe('luminumbra-aasimar-touched');
    expect(parsed.version).toBe('prov-v0.12');
    expect(parsed.designation).toBe('Luminumbra Aasimar-touched');
    expect(parsed.sections.map((section) => section.title)).toContain('Immediate Triage Flags');
  });

  test('parses strict Real Moments protocol variant without hardcoded names', () => {
    const parsed = parseSpeciesCareCardMarkdown(protocolCard);

    expect(parsed.slug).toBe('w-e-a-v-e');
    expect(parsed.version).toBe('prov-v0.16');
    expect(parsed.variant).toBe('protocol');
    expect(parsed.summary.legalName).toBe('L.U.N.A. (Logical Universal Nimble Assistant)');
    expect(parsed.summary.preferredName).toBe('W.E.A.V.E');
    expect(parsed.summary.pronouns).toBe('it/its');
    expect(parsed.identity['Legal / system name']).toBe(
      'L.U.N.A. (Logical Universal Nimble Assistant)',
    );
    expect(parsed.identity['Preferred / display name']).toBe('W.E.A.V.E');
    expect(parsed.identity.Pronouns).toBe('it/its');
    expect(parsed.identity.Nature).toBe('Bismuth-particle swarm; not a solid humanoid body.');
    expect(parsed.summary.species).toBe('SYLV-LOGIC-PROV');
    expect(parsed.scanSections.some((section) => section.title === 'State Transitions')).toBe(true);
  });

  test('rejects cards missing required real-schema sections', () => {
    expect(() => parseSpeciesCareCardMarkdown('# Bad\n\n## Card Purpose\n')).toThrow(
      /Physical Card Face/,
    );
  });

  test('loads imported current version and token map from metadata', async () => {
    await writeImportedCard(healthcareCard);

    const loaded = await loadSpeciesCareCard('luna-midori', { cardsDir: testCardsDir });
    expect(loaded?.summary.preferredName).toBe('Luna Midori');

    const map = await loadSpeciesCareCardsForMarkdown(
      'Before\n\n{{speciescard: lore/luna-midori}}\n\nAfter',
      testCardsDir,
    );
    expect(map['lore/luna-midori']?.status).toBe('loaded');
  });

  test('resolves hidden route path from in-world rm-health URI', async () => {
    await writeImportedCard(healthcareCard);

    const result = await loadSpeciesCareCardByRoutePath(
      ['species-card', 'ar', 'sapporo', 'midori', 'luna', '0121', 'aas-tch-luminumbra-prov'],
      { version: 'prov-v0.15', cardsDir: testCardsDir },
    );

    expect(result?.record.slug).toBe('luna-midori');
    expect(result?.availableVersions).toHaveLength(1);
  });

  test('resolves linked shared profile from scanned record source path', async () => {
    await writeImportedCard(healthcareCard);
    await writeImportedProfile(luminumbraProfile);

    const linked = await loadLinkedSpeciesCareProfile(
      'campaigns/real-moments/medical/luminumbra-care-profile.md',
      { profilesDir: testProfilesDir },
    );
    expect(linked?.record.title).toBe('Luminumbra Care Profile');

    const result = await loadSpeciesCareCardByRoutePath(
      ['species-card', 'ar', 'sapporo', 'midori', 'luna', '0121', 'aas-tch-luminumbra-prov'],
      { version: 'prov-v0.15', cardsDir: testCardsDir, profilesDir: testProfilesDir },
    );

    expect(result?.linkedProfile?.record.slug).toBe('luminumbra-aasimar-touched');
    expect(result?.linkedProfile?.sourceReference).toBe(
      'campaigns/real-moments/medical/luminumbra-care-profile.md',
    );
  });
});
