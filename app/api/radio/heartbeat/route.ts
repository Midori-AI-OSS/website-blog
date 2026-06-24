import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface HeartbeatBody {
  sessionId: string;
  channel: string;
  stopped?: boolean;
}

const heartbeats = new Map<string, number>();

const PRUNE_INTERVAL_MS = 300_000;
const STALE_AFTER_MS = 60_000;

let pruneTimer: ReturnType<typeof setInterval> | null = null;

function ensurePruneTimer(): void {
  if (pruneTimer !== null) {
    return;
  }

  pruneTimer = setInterval(() => {
    const cutoff = Date.now() - STALE_AFTER_MS;

    for (const [sessionId, timestamp] of heartbeats) {
      if (timestamp < cutoff) {
        heartbeats.delete(sessionId);
      }
    }
  }, PRUNE_INTERVAL_MS);

  if (typeof pruneTimer === 'object' && typeof pruneTimer.unref === 'function') {
    pruneTimer.unref();
  }
}

function countActiveListeners(): number {
  const cutoff = Date.now() - STALE_AFTER_MS;
  let count = 0;

  for (const timestamp of heartbeats.values()) {
    if (timestamp > cutoff) {
      count++;
    }
  }

  return count;
}

export async function POST(request: NextRequest) {
  try {
    const body: HeartbeatBody = await request.json();

    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json(
        { count: countActiveListeners() },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        },
      );
    }

    if (body.stopped === true) {
      heartbeats.delete(body.sessionId);
    } else {
      heartbeats.set(body.sessionId, Date.now());
    }

    ensurePruneTimer();

    return NextResponse.json(
      { count: countActiveListeners() },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      },
    );
  } catch {
    return NextResponse.json(
      { count: 0 },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      },
    );
  }
}
