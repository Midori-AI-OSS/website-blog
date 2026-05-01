import { NextResponse } from 'next/server';

import { getPostBySlug, loadAllPosts } from '@/lib/blog/loader';
import { renderLlmPostText } from '@/lib/llm/text';

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
  const posts = await loadAllPosts();
  const post = getPostBySlug(posts, slug);

  if (!post) {
    return textResponse('Not found', 404);
  }

  return textResponse(renderLlmPostText('blog', post));
}
