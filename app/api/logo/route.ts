import { NextResponse } from 'next/server';

const LOGO_URL = 'https://tea-cup.midori-ai.xyz/download/blog-logo.png';
const REVALIDATE_SECONDS = 1800;

export async function GET() {
  const response = await fetch(LOGO_URL, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    return new NextResponse('Logo not available', { status: 502 });
  }

  const imageData = await response.arrayBuffer();
  const contentType = response.headers.get('Content-Type') || 'image/png';

  return new NextResponse(new Uint8Array(imageData), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=300`,
    },
  });
}
