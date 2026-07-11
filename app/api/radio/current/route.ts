import { type NextRequest, NextResponse } from 'next/server';
import { normalizeChannel } from '@/lib/radio/contract';

export const runtime = 'nodejs';

const RADIO_BASE_URL = 'https://radio.midori-ai.xyz';
const UPSTREAM_TIMEOUT_MS = 3_000;

interface CurrentCacheEntry {
  body: string;
  contentType: string;
  status: number;
}

const pendingCurrentRequests = new Map<string, Promise<CurrentCacheEntry>>();

function createCurrentResponse(entry: CurrentCacheEntry): NextResponse {
  return new NextResponse(entry.body, {
    status: entry.status,
    headers: {
      'Content-Type': entry.contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

async function fetchCurrentFromUpstream(channel: string): Promise<CurrentCacheEntry> {
  const upstreamUrl = `${RADIO_BASE_URL}/radio/v1/current?channel=${encodeURIComponent(channel)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get('content-type') ?? 'application/json';

    return {
      body,
      contentType,
      status: upstream.status,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: NextRequest) {
  try {
    const rawChannel = request.nextUrl.searchParams.get('channel');
    const channel = normalizeChannel(rawChannel);
    const pending = pendingCurrentRequests.get(channel);
    if (pending !== undefined) {
      return createCurrentResponse(await pending);
    }

    const upstreamRequest = fetchCurrentFromUpstream(channel);
    pendingCurrentRequests.set(channel, upstreamRequest);

    try {
      return createCurrentResponse(await upstreamRequest);
    } finally {
      if (pendingCurrentRequests.get(channel) === upstreamRequest) {
        pendingCurrentRequests.delete(channel);
      }
    }
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
      },
    );
  }
}
