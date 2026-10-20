/**
 * Serves fingerprinted images from public/shared/<owner>/.
 * Cache freshness follows the oldest matching Blog or Lore owner post date.
 */

import { join } from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { getSharedImageCacheSeconds } from '@/lib/content/imageCachePolicy';
import { serveFingerprintedImage } from '@/lib/content/imageResponse.server';
import { getSharedImageOwnerDateIndex } from '@/lib/content/sharedImageOwnerDateIndex.server';

const SHARED_IMAGES_DIR = join(process.cwd(), 'public/shared');

function isValidPathSegments(segments: string[]): boolean {
  if (!Array.isArray(segments) || segments.length < 2) return false;
  return segments.every((segment) => {
    if (typeof segment !== 'string' || segment.length === 0 || segment.length > 128) return false;
    if (segment === '.' || segment === '..') return false;
    return /^[a-zA-Z0-9._-]+$/.test(segment);
  });
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!isValidPathSegments(path)) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  const filename = path[path.length - 1] ?? '';
  if (!/\.(png|jpg|jpeg|webp)$/i.test(filename)) {
    return new NextResponse('Invalid filename', { status: 400 });
  }

  try {
    const relativePath = path.join('/');
    const ownerDates = await getSharedImageOwnerDateIndex();
    const cacheTtlSeconds = getSharedImageCacheSeconds(path, ownerDates);
    return await serveFingerprintedImage({
      filepath: join(SHARED_IMAGES_DIR, ...path),
      cachePath: `shared/${relativePath}`,
      contentType: getContentType(filename),
      cacheTtlSeconds,
      hasVersion: request.nextUrl.searchParams.has('v'),
      requestedVersion: request.nextUrl.searchParams.get('v'),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('ENOENT')) {
      return new NextResponse('Image not found', { status: 404 });
    }
    console.error(`Error serving shared image ${path.join('/')}:`, errorMessage);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
