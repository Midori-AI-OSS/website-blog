/**
 * Blog Images API Route
 * Serves images from public/blog/ directory dynamically at runtime
 * Similar to how loadAllPosts() serves blog posts
 * 
 * SECURITY FEATURES:
 * - Filename validation to prevent path traversal
 * - Only allows specific image formats
 * 
 * CACHING:
 * - 1-minute in-memory cache
 * - Browser cache headers
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

const BLOG_IMAGES_DIR = join(process.cwd(), 'public/blog');
const CACHE_TTL = 60000; // 1 minute in milliseconds

// In-memory cache for images
const imageCache = new Map<string, { data: Buffer; timestamp: number; contentType: string }>();

/**
 * Validate filename format (security)
 * Only allows safe image filenames to prevent path traversal
 * 
 * @param filename - The filename to validate
 * @returns true if valid format, false otherwise
 */
function isValidImageFilename(filename: string): boolean {
    // Allow YYYY-MM-DD.png, YYYY-MM-DD.jpg, or placeholder.png
    return /^(\d{4}-\d{2}-\d{2}|placeholder|test-image)\.(png|jpg|jpeg|webp)$/.test(filename);
}

/**
 * Get content type based on file extension
 */
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
 * GET /api/blog-images/[filename]
 * Serves blog images with caching
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        // Next.js 15+: params is now a Promise
        const { filename } = await params;

        // Security: validate filename format
        if (!isValidImageFilename(filename)) {
            console.warn(`Invalid image filename requested: ${filename}`);
            return new NextResponse('Invalid filename', { status: 400 });
        }

        // Check cache
        const now = Date.now();
        const cached = imageCache.get(filename);
        if (cached && now - cached.timestamp < CACHE_TTL) {
            return new NextResponse(new Uint8Array(cached.data), {
                headers: {
                    'Content-Type': cached.contentType,
                    'Cache-Control': 'public, max-age=60',
                },
            });
        }

        // Read image from filesystem
        const filepath = join(BLOG_IMAGES_DIR, filename);
        const imageData = await readFile(filepath);
        const contentType = getContentType(filename);

        // Store in cache
        imageCache.set(filename, {
            data: imageData,
            timestamp: now,
            contentType,
        });

        // Return image with cache headers
        return new NextResponse(new Uint8Array(imageData), {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=60',
            },
        });
    } catch (error) {
        // Handle file not found or other errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const { filename } = await params;
        console.error(`Error serving image ${filename}:`, errorMessage);

        // Return 404 if file doesn't exist
        if (errorMessage.includes('ENOENT')) {
            return new NextResponse('Image not found', { status: 404 });
        }

        return new NextResponse('Internal server error', { status: 500 });
    }
}
