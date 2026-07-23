import { NextResponse } from 'next/server';
import { isValidTtsIdentity, ttsIdentityQuery } from '@/lib/tts/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTS_BASE = 'http://127.0.0.1:8888';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; slug: string; index: string }> },
) {
  try {
    const { type, slug, index } = await params;
    const requestUrl = new URL(request.url);
    const contentHash = requestUrl.searchParams.get('content_hash');
    const cacheVersion = requestUrl.searchParams.get('cache_version');

    if (!['blog', 'lore'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (!isValidTtsIdentity(contentHash, cacheVersion)) {
      return NextResponse.json(
        { error: 'Invalid TTS content hash or cache version' },
        { status: 400 },
      );
    }

    const parsedIndex = Number(index);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid chunk index, expected non-negative integer' },
        { status: 400 },
      );
    }

    const upstream = await fetch(
      `${TTS_BASE}/chunk/${encodeURIComponent(type)}/${encodeURIComponent(slug)}/${parsedIndex}?${ttsIdentityQuery(contentHash ?? '')}`,
      { cache: 'no-store' },
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      const message = detail || 'Chunk unavailable';
      return NextResponse.json(
        { error: 'Chunk unavailable', detail: message },
        { status: upstream.status },
      );
    }

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set(
      'Content-Disposition',
      `inline; filename="${slug}-${contentHash?.slice(0, 12)}-${String(parsedIndex).padStart(4, '0')}.wav"`,
    );

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    return NextResponse.json(
      { error: 'TTS service unavailable', detail: message },
      { status: 502 },
    );
  }
}
