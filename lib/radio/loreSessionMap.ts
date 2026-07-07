/**
 * Lore Session Map
 *
 * Maps session numbers to lore slug families, detects POV from channels and
 * metadata aliases, and resolves which lore post should display for a given
 * radio session + POV combination.
 */

import type { ParsedPost } from '@/lib/blog/parser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoreMatchResult {
  slug: string;
  href: string;
  title: string;
  summary: string;
  coverImageUrl: string;
  tags: string[];
  game: string;
  episodeLabel: string;
}

export interface LoreMatchParams {
  session: number;
  pov: string | null;
  posts: ParsedPost[];
}

export type PovName = 'luna' | 'leo' | 'echo' | 'riley' | 'weave';

// ---------------------------------------------------------------------------
// Session-to-Slug Family Config (sessions 0-5)
// ---------------------------------------------------------------------------

/**
 * Each session maps to a family of possible lore slugs (real-moments game).
 * Session 0 always maps to ['luz-blessee-bar'].
 */
const SESSION_SLUG_FAMILIES: Record<number, readonly string[]> = {
  0: ['luz-blessee-bar'],

  1: [
    'riley-memoria-crystalli',
    'echo-memoria-crystalli',
    'leo-memoria-crystalli',
    'luna-memoria-crystalli',
    'w-e-a-v-e-memoria-crystalli',
  ],

  2: ['riley-rumbodo', 'echo-rumbodo', 'leo-rumbodo', 'luna-rumbodo', 'w-e-a-v-e-rumbodo'],

  3: [
    'riley-lux-maboroshi',
    'echo-lux-maboroshi',
    'leo-lux-maboroshi',
    'luna-lux-maboroshi',
    'w-e-a-v-e-lux-maboroshi',
  ],

  4: [
    'echo-post-proelium',
    'leo-post-proelium',
    'luna-post-proelium',
    'w-e-a-v-e-post-proelium',
    'echo-sub-umbris-ad-lucem-vehimur',
    'leo-sub-umbris-ad-lucem-vehimur',
    'luna-sub-umbris-ad-lucem-vehimur',
    'w-e-a-v-e-sub-umbris-ad-lucem-vehimur',
    'echo-sangre-y-lux-residua',
    'leo-sangre-y-lux-residua',
    'luna-sangre-y-lux-residua',
    'w-e-a-v-e-sangre-y-lux-residua',
    'riley-maneo-per-stratum-post-dies-lux',
    'echo-maneo-per-stratum-post-dies-lux',
    'leo-maneo-per-stratum-post-dies-lux',
    'luna-maneo-per-stratum-post-dies-lux',
    'w-e-a-v-e-maneo-per-stratum-post-dies-lux',
  ],

  5: [
    'riley-nondum-per-stratum-lente',
    'echo-nondum-per-stratum-lente',
    'leo-nondum-per-stratum-lente',
    'luna-nondum-per-stratum-lente',
    'w-e-a-v-e-nondum-per-stratum-lente',
  ],
};

// ---------------------------------------------------------------------------
// Channel-to-POV Direct Map
// ---------------------------------------------------------------------------

const CHANNEL_TO_POV: Record<string, PovName> = {
  'lunar-mix': 'luna',
  'leo-mix': 'leo',
  'echo-mix': 'echo',
  'riley-mix': 'riley',
  'weave-mix': 'weave',
};

const NON_CHARACTER_CHANNELS = new Set([
  'indie',
  'instrumental',
  'lofi',
  'friends-music',
  'bits-tech',
  'recordatio',
]);

// ---------------------------------------------------------------------------
// POV Alias Detection Map
// ---------------------------------------------------------------------------

/**
 * General POV alias detection map.
 * Maps each PovName to an array of possible text aliases (lowercase) found
 * in metadata texts (title, summary, episode_label).
 */
const POV_ALIASES: Record<PovName, readonly string[]> = {
  luna: ['luna', 'luna midori'],
  leo: ['leo', 'leo midori'],
  echo: ['echo'],
  riley: ['riley'],
  weave: ['weave', 'w.e.a.v.e.'],
};

/**
 * Session 4 subarc alias map.
 * Provides session-4-specific aliases that override the general alias map
 * when session === 4 and general detection does not find a POV.
 */
const SESSION_4_SUBARC_ALIASES: Record<PovName, readonly string[]> = {
  luna: ['luna', 'luna midori'],
  leo: ['leo', 'leo midori'],
  echo: ['echo'],
  riley: ['riley', 'real riley'],
  weave: ['weave', 'w.e.a.v.e.', 'w.e.a.v.e'],
};

// ---------------------------------------------------------------------------
// Derived lookup maps (built at module scope)
// ---------------------------------------------------------------------------

/** Reverse map: slug → session number. */
const SLUG_TO_SESSION: Record<string, number> = {};
for (const [sessionStr, slugs] of Object.entries(SESSION_SLUG_FAMILIES)) {
  const session = Number(sessionStr);
  for (const slug of slugs) {
    SLUG_TO_SESSION[slug] = session;
  }
}

// ---------------------------------------------------------------------------
// Pure Functions
// ---------------------------------------------------------------------------

/**
 * Coerces input to an integer via `Number(input)`.
 * Returns `null` for non-finite, NaN, or negative results.
 */
export function normalizeSessionNumber(input: unknown): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === 'boolean') return null;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return null;
  }

  const n = Number(input);
  if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) return null;

  return Math.trunc(n);
}

/**
 * Finds the highest session number among the given posts.
 *
 * Derives session by checking which session family each post's slug belongs
 * to. Falls back to 0 for posts with no determinable session or empty input.
 */
export function detectHighestSession(posts: ParsedPost[]): number {
  let highest = 0;
  for (const post of posts) {
    const slug = post.filename.replace(/\.md$/i, '');
    const session = SLUG_TO_SESSION[slug];
    if (session !== undefined && session > highest) {
      highest = session;
    }
  }
  return highest;
}

/**
 * Maps a channel name to its POV character.
 * Returns `null` for unrecognized or non-character channels.
 * Matching is case-insensitive.
 */
export function detectPovFromChannel(channel: string): PovName | null {
  const normalized = channel.trim().toLowerCase();
  if (NON_CHARACTER_CHANNELS.has(normalized)) return null;
  return CHANNEL_TO_POV[normalized] ?? null;
}

/**
 * Scans texts (case-insensitive) for POV aliases and returns the first
 * matching POV name, or `null` if none found.
 *
 * Null/undefined entries in the array are skipped.
 * Empty array returns `null`.
 */
export function detectPovFromAliases(
  texts: (string | null | undefined)[],
  session?: number,
): PovName | null {
  if (texts.length === 0) return null;

  // Select alias map — session 4 uses its own subarc aliases
  const aliasMap = session === 4 ? SESSION_4_SUBARC_ALIASES : POV_ALIASES;

  for (const text of texts) {
    if (text === null || text === undefined) continue;
    const lower = text.toLowerCase();

    for (const [pov, aliases] of Object.entries(aliasMap) as [PovName, readonly string[]][]) {
      for (const alias of aliases) {
        if (lower.includes(alias)) {
          return pov;
        }
      }
    }
  }

  return null;
}

/**
 * Scans an array of texts for session number patterns and returns the
 * highest normalized session number, or `null` if none is found.
 *
 * Handles both singular ("session 3") and plural ("sessions 3 and 4",
 * "sessions 1, 2, and 3") forms. When multiple session numbers appear
 * across any texts, the largest valid number is returned.
 *
 * - Null/undefined entries are skipped.
 * - Matching is case-insensitive.
 */
export function detectSessionFromTexts(texts: (string | null | undefined)[]): number | null {
  const allNumbers: number[] = [];

  for (const text of texts) {
    if (!text) continue;

    // Singular: "session X", "sessionX" (case-insensitive, optional whitespace)
    const singularMatches = text.matchAll(/session\s*(\d+)/gi);
    for (const m of singularMatches) {
      const n = normalizeSessionNumber(m[1]);
      if (n !== null) allNumbers.push(n);
    }

    // Plural: "sessions 3 and 4", "sessions 1, 2, and 3"
    // Captures the full number list after "sessions", then extracts each digit sequence
    const pluralMatches = text.matchAll(/sessions\s+(\d+(?:\s*(?:,?\s*(?:and\s+)?)\d+)*)/gi);
    for (const m of pluralMatches) {
      const capture = m[1];
      if (!capture) continue;
      const nums = capture.match(/\d+/g);
      if (nums) {
        for (const nStr of nums) {
          const n = normalizeSessionNumber(nStr);
          if (n !== null) allNumbers.push(n);
        }
      }
    }
  }

  if (allNumbers.length === 0) return null;
  return Math.max(...allNumbers);
}

/**
 * Helper: derive the slug from a ParsedPost (strips `.md` from filename).
 */
function postSlug(post: ParsedPost): string {
  return post.filename.replace(/\.md$/i, '');
}

/**
 * Resolves which lore post matches a given session + POV combination.
 *
 * - Filters `posts` to only those with `game: 'real-moments'`.
 * - For session 0: always returns `luz-blessee-bar` regardless of POV.
 * - For sessions > 0 with a known POV: returns the post in the session's
 *   slug family whose character tag matches the POV.
 * - For sessions > 0 with null POV: returns the first post in the family
 *   alphabetically by slug.
 * - Returns `null` if no matching post exists.
 */
export function resolveLoreMatch(params: LoreMatchParams): LoreMatchResult | null {
  const { session, pov, posts } = params;

  const family = SESSION_SLUG_FAMILIES[session];
  if (!family || family.length === 0) return null;

  const realMomentsPosts = posts.filter((p) => p.metadata.game === 'real-moments');

  // Build a lookup by slug for the real-moments posts
  const postBySlug = new Map<string, ParsedPost>();
  for (const post of realMomentsPosts) {
    postBySlug.set(postSlug(post), post);
  }

  // Session 0 always returns luz-blessee-bar
  if (session === 0) {
    const post = postBySlug.get('luz-blessee-bar');
    if (!post) return null;
    return toMatchResult(post);
  }

  // Session > 0
  if (pov !== null && pov !== undefined) {
    // Find the post whose character tag matches the POV
    const povLower = pov.toLowerCase();
    for (const slug of family) {
      const post = postBySlug.get(slug);
      if (!post) continue;
      if (post.metadata.tags?.some((t) => t.toLowerCase() === povLower)) {
        return toMatchResult(post);
      }
    }
    return null;
  }

  // Null POV for session > 0: return first post in family alphabetically by slug
  const sortedFamily = [...family].sort((a, b) => a.localeCompare(b));
  for (const slug of sortedFamily) {
    const post = postBySlug.get(slug);
    if (post) return toMatchResult(post);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toMatchResult(post: ParsedPost): LoreMatchResult {
  return {
    slug: postSlug(post),
    href: `/lore/${postSlug(post)}`,
    title: post.metadata.title,
    summary: post.metadata.summary ?? '',
    coverImageUrl: post.metadata.cover_image ?? '',
    tags: post.metadata.tags ?? [],
    game: post.metadata.game ?? '',
    episodeLabel: post.metadata.episode_label ?? '',
  };
}
