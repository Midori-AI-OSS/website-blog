import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getImageResponseCacheControl, imageByteCache } from './imageByteCache.server';
import { getFileFingerprint } from './imageFingerprint.server';

interface ImageResponseOptions {
  filepath: string;
  cachePath: string;
  contentType: string;
  cacheTtlSeconds: number;
  hasVersion: boolean;
  requestedVersion: string | null;
}

function versionMismatchResponse(): NextResponse {
  return new NextResponse('Image version mismatch', {
    status: 409,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function serveFingerprintedImage({
  filepath,
  cachePath,
  contentType,
  cacheTtlSeconds,
  hasVersion,
  requestedVersion,
}: ImageResponseOptions): Promise<NextResponse> {
  const fingerprintFromMetadata = await getFileFingerprint(filepath);
  const requestedIsValid =
    !hasVersion || (requestedVersion !== null && /^[a-f\d]{64}$/i.test(requestedVersion));
  if (!requestedIsValid || (hasVersion && requestedVersion !== fingerprintFromMetadata)) {
    return versionMismatchResponse();
  }

  const responseCacheControl = getImageResponseCacheControl(
    hasVersion ? cacheTtlSeconds : 60,
    hasVersion,
  );
  const cacheKey = `${cachePath}:${fingerprintFromMetadata}`;
  const cached = imageByteCache.get(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.data), {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': responseCacheControl,
      },
    });
  }

  const data = await readFile(filepath);
  const fingerprintFromData = createHash('sha256').update(data).digest('hex');
  if (hasVersion && requestedVersion !== fingerprintFromData) return versionMismatchResponse();

  const finalCacheKey = `${cachePath}:${fingerprintFromData}`;
  imageByteCache.set(finalCacheKey, { data, contentType }, cacheTtlSeconds);

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': responseCacheControl,
    },
  });
}
