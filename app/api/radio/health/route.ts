import { NextResponse } from 'next/server';
import {
  isRadioEnvelope,
  MIDORIAI_RADIO_API_VERSION,
  MIDORIAI_RADIO_BASE_URL,
} from '@/lib/radio/contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_TIMEOUT_MS = 3_000;

function errorResponse(code: string, message: string): NextResponse {
  return NextResponse.json(
    {
      version: MIDORIAI_RADIO_API_VERSION,
      ok: false,
      now: new Date().toISOString(),
      data: null,
      error: { code, message },
    },
    {
      status: 502,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    },
  );
}

export async function GET(): Promise<NextResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(`${MIDORIAI_RADIO_BASE_URL}/health`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      return errorResponse('INVALID_UPSTREAM_ENVELOPE', 'Radio health returned invalid JSON');
    }

    if (
      !response.ok ||
      !isRadioEnvelope(payload) ||
      payload.version !== MIDORIAI_RADIO_API_VERSION
    ) {
      return errorResponse('UPSTREAM_UNHEALTHY', `Radio health returned HTTP ${response.status}`);
    }

    if (!payload.ok || payload.data === null) {
      return errorResponse(
        payload.error?.code ?? 'UPSTREAM_UNHEALTHY',
        payload.error?.message ?? 'Radio health reported unavailable',
      );
    }

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    const code = controller.signal.aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNREACHABLE';
    const message = error instanceof Error ? error.message : 'Unknown upstream error';
    return errorResponse(code, message);
  } finally {
    clearTimeout(timeoutId);
  }
}
