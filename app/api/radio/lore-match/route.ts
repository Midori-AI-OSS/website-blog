import { type NextRequest, NextResponse } from 'next/server';
import { getPublishState } from '@/lib/content/publish';
import { loadAllLorePosts } from '@/lib/lore/loader';
import { normalizeChannel } from '@/lib/radio/contract';
import {
  detectHighestSession,
  detectPovFromAliases,
  detectPovFromChannel,
  normalizeSessionNumber,
  resolveLoreMatch,
} from '@/lib/radio/loreSessionMap';

export const runtime = 'nodejs';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawTitle = searchParams.get('title');
    const rawChannel = searchParams.get('channel');

    if (!rawTitle || !rawChannel) {
      return NextResponse.json({ ok: false }, { headers: NO_STORE_HEADERS });
    }

    const title = rawTitle;
    const channel = normalizeChannel(rawChannel);
    const comment = searchParams.get('comment');
    const backstory = searchParams.get('backstory');
    const theme = searchParams.get('theme');

    const allPosts = await loadAllLorePosts();

    const filteredPosts = allPosts.filter((post) => {
      if (post.metadata.password) return false;
      const { isPublished } = getPublishState(post.metadata.date, new Date());
      if (!isPublished) return false;
      if (post.metadata.game !== 'real-moments') return false;
      return true;
    });

    // Detect session from title
    const sessionMatch = title.match(/session\s*(\d+)/i);
    let session: number | null = null;
    if (sessionMatch) {
      session = normalizeSessionNumber(sessionMatch[1]);
    }
    if (session === null) {
      session = detectHighestSession(filteredPosts);
    }

    // Detect POV
    let pov: string | null = null;
    if (channel === 'all') {
      const texts = [comment, backstory, theme].filter(Boolean) as string[];
      pov = detectPovFromAliases(texts, session ?? undefined);
    } else {
      pov = detectPovFromChannel(channel);
    }

    const match = resolveLoreMatch({ session, pov, posts: filteredPosts });

    return NextResponse.json({ ok: true, match }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: NO_STORE_HEADERS });
  }
}
