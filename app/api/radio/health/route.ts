import { NextResponse } from 'next/server';
import { getRadioHealth, RADIO_HEALTH_NO_STORE_HEADERS } from '@/lib/radio/radioHealthManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const envelope = await getRadioHealth();
  return NextResponse.json(envelope, {
    status: envelope.ok ? 200 : 502,
    headers: RADIO_HEALTH_NO_STORE_HEADERS,
  });
}
