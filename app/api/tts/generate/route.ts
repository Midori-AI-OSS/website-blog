import { type NextRequest, NextResponse } from 'next/server';
import { isValidTtsIdentity } from '@/lib/tts/contract';
import type { SpeechDocument } from '@/lib/tts/speechDocument';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTS_BASE = 'http://127.0.0.1:8888';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document, slug, type, content_hash, cache_version } = body as {
      document: SpeechDocument;
      slug: string;
      type: string;
      content_hash: string;
      cache_version: string;
    };

    if (!document?.text || !document.paragraphs?.length || !slug || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: document, slug, type' },
        { status: 400 },
      );
    }

    if (!['blog', 'lore'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type, must be "blog" or "lore"' },
        { status: 400 },
      );
    }

    if (!isValidTtsIdentity(content_hash, cache_version)) {
      return NextResponse.json(
        { error: 'Invalid TTS content hash or cache version' },
        { status: 400 },
      );
    }
    if (
      request.nextUrl.searchParams.get('content_hash') !== content_hash ||
      request.nextUrl.searchParams.get('cache_version') !== cache_version
    ) {
      return NextResponse.json(
        { error: 'TTS request URL identity does not match its body' },
        { status: 409 },
      );
    }

    const upstream = await fetch(`${TTS_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document, slug, type, content_hash, cache_version }),
      cache: 'no-store',
    });

    const upstreamBody = await upstream.text();
    const contentType = upstream.headers.get('content-type') ?? 'application/json';

    return new NextResponse(upstreamBody, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    return NextResponse.json(
      { error: 'TTS service unavailable', detail: message },
      { status: 502 },
    );
  }
}
