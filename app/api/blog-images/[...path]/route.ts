/**
 * Serves fingerprinted blog images from public/blog/.
 * Legacy requests without a fingerprint remain available with short freshness.
 */

import { join } from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { getBlogImageCacheSeconds } from '@/lib/content/imageCachePolicy';
import { serveFingerprintedImage } from '@/lib/content/imageResponse.server';

const BLOG_IMAGES_DIR = join(process.cwd(), 'public/blog');
const MONTH_IMAGE_NAMES = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.png$/i;

function isValidBlogImagePath(path: string[]): boolean {
  if (path.length === 1) {
    return /^(\d{4}-\d{2}-\d{2}|placeholder|test-image)\.(png|jpg|jpeg|webp)$/.test(path[0] ?? '');
  }

  return (
    path.length === 3 &&
    path[0] === 'years' &&
    /^\d{4}$/.test(path[1] ?? '') &&
    MONTH_IMAGE_NAMES.test(path[2] ?? '')
  );
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
  if (!Array.isArray(path) || path.length === 0 || !isValidBlogImagePath(path)) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  const filename = path[path.length - 1] ?? '';
  try {
    return await serveFingerprintedImage({
      filepath: join(BLOG_IMAGES_DIR, ...path),
      cachePath: `blog/${path.join('/')}`,
      contentType: getContentType(filename),
      cacheTtlSeconds: getBlogImageCacheSeconds(path),
      hasVersion: request.nextUrl.searchParams.has('v'),
      requestedVersion: request.nextUrl.searchParams.get('v'),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error serving image ${path.join('/')}:`, errorMessage);
    if (errorMessage.includes('ENOENT')) {
      return new NextResponse('Image not found', { status: 404 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}
