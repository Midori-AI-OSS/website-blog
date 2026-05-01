import { NextResponse } from 'next/server';

import { loadLlmIndexText } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function textResponse(body: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export async function GET() {
  return textResponse(await loadLlmIndexText());
}
