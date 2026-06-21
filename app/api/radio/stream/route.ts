import { type NextRequest, NextResponse } from 'next/server';
import { normalizeChannel, normalizeQuality } from '@/lib/radio/contract';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const rawChannel = request.nextUrl.searchParams.get('channel');
  const rawQuality = request.nextUrl.searchParams.get('q');

  const channel = normalizeChannel(rawChannel);
  const quality = normalizeQuality(rawQuality);

  const upstreamUrl = `https://radio.midori-ai.xyz/radio/v1/stream?channel=${encodeURIComponent(channel)}&q=${encodeURIComponent(quality)}`;

  const upstreamResponse = await fetch(upstreamUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'audio/mpeg, audio/*;q=0.9, */*;q=0.8',
    },
  });

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return new NextResponse('Stream unavailable', { status: 502 });
  }

  return new NextResponse(upstreamResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
