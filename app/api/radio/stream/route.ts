import { type NextRequest, NextResponse } from 'next/server';
import { RadioBroadcaster } from '@/lib/radio/broadcaster';
import { normalizeChannel, normalizeQuality } from '@/lib/radio/contract';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const rawChannel = request.nextUrl.searchParams.get('channel');
  const rawQuality = request.nextUrl.searchParams.get('q');

  const channel = normalizeChannel(rawChannel);
  const quality = normalizeQuality(rawQuality);

  const broadcaster = RadioBroadcaster.getInstance(channel, quality);
  const stream = broadcaster.subscribe();

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
