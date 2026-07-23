import { type NextRequest, NextResponse } from 'next/server';
import { isValidTtsIdentity } from '@/lib/tts/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTS_BASE = 'http://127.0.0.1:8888';

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const type = request.nextUrl.searchParams.get('type');
    const contentHash = request.nextUrl.searchParams.get('content_hash');
    const cacheVersion = request.nextUrl.searchParams.get('cache_version');

    if (!slug || !type) {
      return NextResponse.json(
        { error: 'Missing required query params: slug, type' },
        { status: 400 },
      );
    }

    if (!isValidTtsIdentity(contentHash, cacheVersion)) {
      return NextResponse.json(
        { error: 'Invalid TTS content hash or cache version' },
        { status: 400 },
      );
    }

    const upstream = await fetch(
      `${TTS_BASE}/status?slug=${encodeURIComponent(slug)}&type=${encodeURIComponent(type)}&content_hash=${encodeURIComponent(contentHash ?? '')}&cache_version=${encodeURIComponent(cacheVersion ?? '')}`,
      { cache: 'no-store' },
    );

    const body = await upstream.text();
    const contentType = upstream.headers.get('content-type') ?? 'application/json';

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    return NextResponse.json(
      {
        status: 'not_generated',
        generated_chunks: 0,
        total_chunks: 0,
        playable: false,
        cache_version: request.nextUrl.searchParams.get('cache_version') ?? '',
        content_hash: request.nextUrl.searchParams.get('content_hash') ?? '',
        error: 'TTS service unavailable',
        detail: message,
      },
      { status: 502 },
    );
  }
}
