import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RADIO_BASE_URL = 'https://radio.midori-ai.xyz';

export async function GET() {
  try {
    const upstream = await fetch(`${RADIO_BASE_URL}/radio/v1/channels`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get('content-type') ?? 'application/json';

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upstream error';

    return NextResponse.json(
      {
        version: 'radio.v1',
        ok: false,
        now: new Date().toISOString(),
        data: null,
        error: {
          code: 'UPSTREAM_UNREACHABLE',
          message,
        },
      },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
