import { NextResponse } from 'next/server';
import { getRadioHealth, RADIO_HEALTH_NO_STORE_HEADERS } from '@/lib/radio/radioHealthManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const envelope = await getRadioHealth();
    return NextResponse.json(envelope, {
      status: envelope.ok ? 200 : 502,
      headers: RADIO_HEALTH_NO_STORE_HEADERS,
    });
  } catch {
    return NextResponse.json(
      {
        version: 'radio.v1',
        ok: false,
        now: new Date().toISOString(),
        data: null,
        error: {
          code: 'RADIO_HEALTH_UNAVAILABLE',
          message: 'Radio health is unavailable',
        },
      },
      { status: 502, headers: RADIO_HEALTH_NO_STORE_HEADERS },
    );
  }
}
