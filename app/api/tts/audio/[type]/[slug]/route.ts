import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTS_BASE = 'http://127.0.0.1:8888';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
) {
  try {
    const { type, slug } = await params;

    if (!['blog', 'lore'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    const upstream = await fetch(
      `${TTS_BASE}/audio/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    );

    if (upstream.status === 404) {
      return NextResponse.json(
        { error: 'Audio not found' },
        { status: 404 }
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream error' },
        { status: upstream.status }
      );
    }

    const audioBuffer = await upstream.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=86400',
        'Content-Disposition': `inline; filename="${slug}.wav"`,
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
