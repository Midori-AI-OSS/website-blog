import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTS_BASE = 'http://127.0.0.1:8888';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, slug, type } = body as {
      text: string;
      slug: string;
      type: string;
    };

    if (!text || !slug || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: text, slug, type' },
        { status: 400 }
      );
    }

    if (!['blog', 'lore'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type, must be "blog" or "lore"' },
        { status: 400 }
      );
    }

    const upstream = await fetch(`${TTS_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, slug, type }),
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
    const message =
      error instanceof Error ? error.message : 'Unknown upstream error';
    return NextResponse.json(
      { error: 'TTS service unavailable', detail: message },
      { status: 502 }
    );
  }
}
