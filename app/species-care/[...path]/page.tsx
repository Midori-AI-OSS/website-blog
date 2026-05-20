import { notFound } from 'next/navigation';

import { SpeciesCareScanView } from '@/components/species-care/SpeciesCareScanView';
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
  searchParams: Promise<{ version?: string | string[] }>;
}) {
  const [{ path }, query] = await Promise.all([params, searchParams]);
  const version = getSingleQueryValue(query.version)?.trim().toLowerCase();
  const result = await loadSpeciesCareCardByRoutePath(path, { version });

  if (!result) notFound();

  return (
    <SpeciesCareScanView
      record={result.record}
      availableVersions={result.availableVersions}
      photoUrl={`/api/lore-images/species-photos/${result.record.slug}.png`}
    />
  );
}
