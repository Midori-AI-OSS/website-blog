import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTS_BASE = 'http://127.0.0.1:8888';

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    const type = request.nextUrl.searchParams.get('type');

    if (!slug || !type) {
      return NextResponse.json(
        { error: 'Missing required query params: slug, type' },
        { status: 400 }
      );
    }

    const upstream = await fetch(
      `${TTS_BASE}/status?slug=${encodeURIComponent(slug)}&type=${encodeURIComponent(type)}`,
      { cache: 'no-store' }
    );

    const body = await upstream.text();
    const contentType =
      upstream.headers.get('content-type') ?? 'application/json';

    return new NextResponse(body, {
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
      {
        status: 'not_generated',
        error: 'TTS service unavailable',
        detail: message,
      },
      { status: 502 }
    );
  }
}
