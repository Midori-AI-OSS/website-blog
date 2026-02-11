import { readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { NextResponse } from 'next/server';
import type { RadioImageInventory } from '@/lib/radio/images';

export const runtime = 'nodejs';

const BLOG_ROOT = join(process.cwd(), 'public', 'blog');
const PLACEHOLDER_URL = '/blog/placeholder.png';
const CACHE_TTL_MS = 60_000;
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

interface CachedResult {
  expiresAt: number;
  payload: RadioImageInventory;
}

let cached: CachedResult | null = null;

function toBlogUrl(absolutePath: string): string | null {
  const rel = relative(BLOG_ROOT, absolutePath);
  if (rel.startsWith('..')) {
    return null;
  }

  const normalized = rel.split('\\').join('/');
  return `/blog/${normalized}`;
}

async function collectBlogImages(currentDir: string): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = join(currentDir, entry.name);

    if (entry.isDirectory()) {
      const nested = await collectBlogImages(fullPath);
      result.push(...nested);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      continue;
    }

    const blogUrl = toBlogUrl(fullPath);
    if (blogUrl !== null) {
      result.push(blogUrl);
    }
  }

  return result;
}

export async function GET() {
  const now = Date.now();

  if (cached !== null && cached.expiresAt > now) {
    return NextResponse.json(cached.payload, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  try {
    const discovered = await collectBlogImages(BLOG_ROOT);
    const uniqueSorted = [...new Set(discovered)].sort((a, b) => a.localeCompare(b));
    const images = uniqueSorted.filter((url) => url !== PLACEHOLDER_URL);

    const payload: RadioImageInventory = {
      images,
      placeholder: PLACEHOLDER_URL,
      count: images.length,
      generated_at: new Date().toISOString(),
    };

    cached = {
      payload,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        images: [],
        placeholder: PLACEHOLDER_URL,
        count: 0,
        generated_at: new Date().toISOString(),
        error: message,
      },
      { status: 500 }
    );
  }
}
