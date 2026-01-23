/**
 * Lore Images API Route
 * Serves images from public/lore/ directory dynamically at runtime.
 *
 * Mirrors the blog images route caching behavior, but allows nested paths so
 * lore pages can use per-page folders like: /lore/luna-dnd/map.png
 *
 * SECURITY FEATURES:
 * - Path segment validation to prevent path traversal
 * - Only allows specific image formats
 *
 * CACHING:
 * - 1-minute in-memory cache
 * - Browser cache headers
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

const LORE_IMAGES_DIR = join(process.cwd(), 'public/lore');
const CACHE_TTL = 60000; // 1 minute in milliseconds

const imageCache = new Map<string, { data: Buffer; timestamp: number; contentType: string }>();

function isValidPathSegments(segments: string[]): boolean {
  if (!Array.isArray(segments) || segments.length === 0) return false;

  // Allow nested folders, but each segment must be safe and not attempt traversal.
  return segments.every((seg) => {
    if (typeof seg !== 'string' || seg.length === 0 || seg.length > 128) return false;
    if (seg === '.' || seg === '..') return false;
    // Allow alphanumerics, underscore, dash, and dot (for extensions / versioning).
    return /^[a-zA-Z0-9._-]+$/.test(seg);
  });
}

function isAllowedImageExtension(filename: string): boolean {
  return /\.(png|jpg|jpeg|webp)$/i.test(filename);
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

/**
 * GET /api/lore-images/[...path]
 * Example: /api/lore-images/luna-dnd/map.png
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Next.js 15+: params is now a Promise
    const { path } = await params;

    if (!isValidPathSegments(path)) {
      console.warn(`Invalid lore image path requested: ${String(path)}`);
      return new NextResponse('Invalid path', { status: 400 });
    }

    const filename = path[path.length - 1] ?? '';
    if (!isAllowedImageExtension(filename)) {
      console.warn(`Invalid lore image extension requested: ${filename}`);
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const cacheKey = path.join('/');

    const now = Date.now();
    const cached = imageCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return new NextResponse(new Uint8Array(cached.data), {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=60',
        },
      });
    }

    const filepath = join(LORE_IMAGES_DIR, ...path);
    const imageData = await readFile(filepath);
    const contentType = getContentType(filename);

    imageCache.set(cacheKey, {
      data: imageData,
      timestamp: now,
      contentType,
    });

    return new NextResponse(new Uint8Array(imageData), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const { path } = await params;
    console.error(`Error serving lore image ${String(path)}:`, errorMessage);

    if (errorMessage.includes('ENOENT')) {
      return new NextResponse('Image not found', { status: 404 });
    }

    return new NextResponse('Internal server error', { status: 500 });
  }
}

