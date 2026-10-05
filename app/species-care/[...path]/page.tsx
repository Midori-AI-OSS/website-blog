import { notFound } from 'next/navigation';

import { SpeciesCareScanView } from '@/components/species-care/SpeciesCareScanView';
import { fingerprintImageSource } from '@/lib/content/imageFingerprint.server';
import { transformPostImageUrl } from '@/lib/content/imageUrl';
import {
  getSpeciesCareStaticRouteParams,
  loadSpeciesCareCardByRoutePath,
} from '@/lib/species-care/loader';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return getSpeciesCareStaticRouteParams();
}

function getSingleQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SpeciesCarePage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ version?: string | string[]; profileVersion?: string | string[] }>;
}) {
  const [{ path }, query] = await Promise.all([params, searchParams]);
  const version = getSingleQueryValue(query.version)?.trim().toLowerCase();
  const profileVersion = getSingleQueryValue(query.profileVersion)?.trim().toLowerCase();
  const result = await loadSpeciesCareCardByRoutePath(path, { version, profileVersion });

  if (!result) notFound();
  const photoUrl = transformPostImageUrl(
    await fingerprintImageSource(`/lore/species-photos/${result.record.slug}.png`),
  );

  return (
    <SpeciesCareScanView
      record={result.record}
      availableVersions={result.availableVersions}
      linkedProfile={result.linkedProfile}
      photoUrl={photoUrl}
    />
  );
}
