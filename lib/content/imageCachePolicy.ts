import type { ParsedPost } from '@/lib/blog/parser';
import type { LoreGameIndex } from '@/lib/lore/loader';

export const IMAGE_CACHE_FALLBACK_SECONDS = 60;
export const IMAGE_PLACEHOLDER_CACHE_SECONDS = 5 * 365 * 24 * 60 * 60;
export const IMAGE_STABLE_LORE_CACHE_SECONDS = 365 * 24 * 60 * 60;
export const IMAGE_STABLE_BLOG_CACHE_SECONDS = 365 * 24 * 60 * 60;
export const IMAGE_TEST_CACHE_SECONDS = 15;
export const IMAGE_POST_AGE_ANCHORS = [
  { ageDays: 4, ttlSeconds: 60 },
  { ageDays: 5, ttlSeconds: 60 * 60 },
  { ageDays: 14, ttlSeconds: 5 * 24 * 60 * 60 },
  { ageDays: 30, ttlSeconds: 14 * 24 * 60 * 60 },
  { ageDays: 90, ttlSeconds: 60 * 24 * 60 * 60 },
  { ageDays: 180, ttlSeconds: 90 * 24 * 60 * 60 },
] as const;

const PORTLAND_TIME_ZONE = 'America/Los_Angeles';
const PORTLAND_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: PORTLAND_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hourCycle: 'h23',
});

export interface LoreImageReference {
  oldestPostDate: string | null;
}

export interface LoreImageReferenceIndex {
  postReferences: ReadonlyMap<string, LoreImageReference>;
  gameCoverPaths: ReadonlySet<string>;
}

interface ImageReferencePost {
  metadata: Pick<ParsedPost['metadata'], 'cover_image' | 'date'>;
  content: string;
}

interface ImageReferenceGame {
  coverImage?: LoreGameIndex['coverImage'];
}

function parseDateString(value: string | undefined): string | null {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match?.[1] || !match[2] || !match[3]) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getPortlandDateAndFraction(now: Date): { date: string; fraction: number } {
  const parts = Object.fromEntries(
    PORTLAND_DATE_TIME_FORMATTER.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = Number(parts.hour ?? 0);
  const minute = Number(parts.minute ?? 0);
  const second = Number(parts.second ?? 0);
  const millisecond = Number(parts.fractionalSecond ?? 0);
  const elapsedSeconds = hour * 3600 + minute * 60 + second + millisecond / 1000;
  return { date, fraction: elapsedSeconds / (24 * 60 * 60) };
}

function utcDayNumber(dateString: string): number {
  const year = Number(dateString.slice(0, 4));
  const month = Number(dateString.slice(5, 7));
  const day = Number(dateString.slice(8, 10));
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
}

export function getPostAgeDays(publicationDate: string | undefined, now: Date): number | null {
  const validPublicationDate = parseDateString(publicationDate);
  if (!validPublicationDate || !Number.isFinite(now.getTime())) return null;

  const current = getPortlandDateAndFraction(now);
  const wholeCalendarDays = utcDayNumber(current.date) - utcDayNumber(validPublicationDate);
  return wholeCalendarDays + current.fraction;
}

export function getPostAgeCacheSeconds(ageDays: number): number {
  if (!Number.isFinite(ageDays)) return IMAGE_CACHE_FALLBACK_SECONDS;
  if (ageDays < 0) return IMAGE_TEST_CACHE_SECONDS;
  if (ageDays < 1) return IMAGE_TEST_CACHE_SECONDS;
  if (ageDays <= 4) return 60;

  for (let index = 1; index < IMAGE_POST_AGE_ANCHORS.length; index++) {
    const previous = IMAGE_POST_AGE_ANCHORS[index - 1];
    const next = IMAGE_POST_AGE_ANCHORS[index];
    if (!previous || !next || ageDays > next.ageDays) continue;

    const progress = (ageDays - previous.ageDays) / (next.ageDays - previous.ageDays);
    return Math.round(previous.ttlSeconds + progress * (next.ttlSeconds - previous.ttlSeconds));
  }

  return IMAGE_POST_AGE_ANCHORS[IMAGE_POST_AGE_ANCHORS.length - 1]?.ttlSeconds ?? 60;
}

export function getPostImageCacheSeconds(
  publicationDate: string | undefined,
  now: Date = new Date(),
): number {
  const ageDays = getPostAgeDays(publicationDate, now);
  return ageDays === null ? IMAGE_CACHE_FALLBACK_SECONDS : getPostAgeCacheSeconds(ageDays);
}

export function parseBlogImageDate(filename: string): string | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})\.(?:png|jpe?g|webp)$/i);
  return match?.[1] ? parseDateString(match[1]) : null;
}

export function getBlogImageCacheSeconds(
  path: string | readonly string[],
  now: Date = new Date(),
): number {
  const normalizedPath = (typeof path === 'string' ? path : path.join('/')).toLowerCase();
  if (
    /^years\/\d{4}\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.png$/.test(normalizedPath)
  ) {
    return IMAGE_STABLE_BLOG_CACHE_SECONDS;
  }

  const filename = normalizedPath.split('/').pop() ?? normalizedPath;
  const normalized = filename.toLowerCase();
  if (/^placeholder\.(?:png|jpe?g|webp)$/.test(normalized)) {
    return IMAGE_PLACEHOLDER_CACHE_SECONDS;
  }
  if (/^test-image\.(?:png|jpe?g|webp)$/.test(normalized)) return IMAGE_TEST_CACHE_SECONDS;

  const date = parseBlogImageDate(filename);
  return date ? getPostImageCacheSeconds(date, now) : IMAGE_CACHE_FALLBACK_SECONDS;
}

export function normalizeLoreImagePath(rawPath: string | undefined): string | null {
  if (!rawPath) return null;

  let pathname: string;
  try {
    pathname = new URL(rawPath.trim(), 'http://local.invalid').pathname;
  } catch {
    return null;
  }

  const withoutPrefix = pathname.replace(/^\/+/, '').replace(/^lore\//i, '');
  const segments: string[] = [];
  for (const rawSegment of withoutPrefix.split('/')) {
    if (!rawSegment) continue;
    let segment: string;
    try {
      segment = decodeURIComponent(rawSegment);
    } catch {
      return null;
    }
    if (segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')) {
      return null;
    }
    segments.push(segment);
  }

  return segments.length > 0 ? segments.join('/') : null;
}

export function buildLoreImageReferenceIndex(
  posts: readonly ImageReferencePost[],
  gameIndexes: readonly ImageReferenceGame[],
): LoreImageReferenceIndex {
  const postReferences = new Map<string, LoreImageReference>();
  const gameCoverPaths = new Set<string>();

  const addPostReference = (rawPath: string, date: string | undefined) => {
    const path = normalizeLoreImagePath(rawPath);
    if (!path) return;

    const referenceDate = parseDateString(date);
    const existing = postReferences.get(path);
    if (!existing) {
      postReferences.set(path, { oldestPostDate: referenceDate });
      return;
    }

    if (referenceDate && (!existing.oldestPostDate || referenceDate < existing.oldestPostDate)) {
      postReferences.set(path, { oldestPostDate: referenceDate });
    }
  };

  for (const post of posts) {
    const date = post.metadata.date;
    if (post.metadata.cover_image) addPostReference(post.metadata.cover_image, date);

    for (const match of post.content.matchAll(/\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi)) {
      const tokenPath = match[1]?.trim();
      if (tokenPath) addPostReference(tokenPath, date);
    }
  }

  for (const game of gameIndexes) {
    const path = normalizeLoreImagePath(game.coverImage);
    if (path) gameCoverPaths.add(path);
  }

  return { postReferences, gameCoverPaths };
}

export function getLoreImageCacheSeconds(
  path: string,
  index: LoreImageReferenceIndex,
  now: Date = new Date(),
): number {
  const normalizedPath = normalizeLoreImagePath(path);
  if (!normalizedPath) return IMAGE_CACHE_FALLBACK_SECONDS;

  const normalizedLower = normalizedPath.toLowerCase();
  if (normalizedLower === 'placeholder.png') return IMAGE_PLACEHOLDER_CACHE_SECONDS;
  if (normalizedLower.startsWith('species-photos/')) return IMAGE_STABLE_LORE_CACHE_SECONDS;
  if (index.gameCoverPaths.has(normalizedPath)) return IMAGE_STABLE_LORE_CACHE_SECONDS;

  const reference = index.postReferences.get(normalizedPath);
  if (!reference?.oldestPostDate) return IMAGE_CACHE_FALLBACK_SECONDS;
  return getPostImageCacheSeconds(reference.oldestPostDate, now);
}
