import { NextResponse } from 'next/server';

import { midoriMcpHandler } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Accept, Content-Type, Last-Event-ID, MCP-Protocol-Version, MCP-Session-Id',
  'Access-Control-Expose-Headers': 'MCP-Session-Id',
} as const;

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request): Promise<Response> {
  return withCors(await midoriMcpHandler.fetch(request));
}

export async function POST(request: Request): Promise<Response> {
  return withCors(await midoriMcpHandler.fetch(request));
}

export async function DELETE(request: Request): Promise<Response> {
  return withCors(await midoriMcpHandler.fetch(request));
}
