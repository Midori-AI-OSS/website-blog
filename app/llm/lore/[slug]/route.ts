import { NextResponse } from 'next/server';

import { renderLlmPostText } from '@/lib/llm/text';
import { getLorePostBySlug, loadAllLorePosts } from '@/lib/lore/loader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function textResponse(body: string, status: number = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const posts = await loadAllLorePosts();
  const post = getLorePostBySlug(posts, slug);

  if (!post) {
    return textResponse('Not found', 404);
  }

  return textResponse(renderLlmPostText('lore', post));
}
