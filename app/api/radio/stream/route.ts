import { NextRequest, NextResponse } from 'next/server';
import { normalizeChannel, normalizeQuality } from '@/lib/radio/contract';

export const runtime = 'nodejs';

const RADIO_BASE_URL = 'https://radio.midori-ai.xyz';

export async function GET(request: NextRequest) {
  try {
    const rawChannel = request.nextUrl.searchParams.get('channel');
    const rawQuality = request.nextUrl.searchParams.get('q');
    const upstreamUrl = new URL('/radio/v1/stream', RADIO_BASE_URL);

    upstreamUrl.searchParams.set('channel', normalizeChannel(rawChannel));
    upstreamUrl.searchParams.set('q', normalizeQuality(rawQuality));

    const cacheBust = request.nextUrl.searchParams.get('ts');
    if (cacheBust !== null && cacheBust.trim().length > 0) {
      upstreamUrl.searchParams.set('ts', cacheBust);
    }

    const upstream = await fetch(upstreamUrl, {
      cache: 'no-store',
      headers: {
        Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (upstream.body === null) {
      return NextResponse.json(
        {
          version: 'radio.v1',
          ok: false,
          now: new Date().toISOString(),
          data: null,
          error: {
            code: 'UPSTREAM_EMPTY_STREAM',
            message: 'Radio stream response did not include a body.',
          },
        },
        {
          status: 502,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          },
        }
      );
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'audio/mpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
        Expires: '0',
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  }
}
