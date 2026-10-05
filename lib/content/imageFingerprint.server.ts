import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { type ArchivePeriod, getPeriodImageCandidates } from '@/lib/blog/archive';
import type { ParsedPost } from '@/lib/blog/parser';
import type { LoreGameGroup } from '@/lib/lore/loader';
import type { SpeciesCareCardEmbedMap } from '@/lib/species-care/types';
import { POST_COVER_PLACEHOLDER_IMAGE, transformPostImageUrl } from './imageUrl';

const FINGERPRINT_CACHE_MAX_ENTRIES = 2048;
const imageFingerprintCache = new Map<string, CachedFingerprint>();

interface CachedFingerprint {
  fingerprint: string;
  device: number;
  inode: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
}

interface StaticImagePath {
  filepath: string;
}

function getFileMetadataSignature(metadata: {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
}): Omit<CachedFingerprint, 'fingerprint'> {
  return {
    device: Number(metadata.dev),
    inode: Number(metadata.ino),
    size: Number(metadata.size),
    mtimeMs: metadata.mtimeMs,
    ctimeMs: metadata.ctimeMs,
  };
}

function metadataMatches(
  cached: CachedFingerprint,
  current: Omit<CachedFingerprint, 'fingerprint'>,
) {
  return (
    cached.device === current.device &&
    cached.inode === current.inode &&
    cached.size === current.size &&
    cached.mtimeMs === current.mtimeMs &&
    cached.ctimeMs === current.ctimeMs
  );
}

function rememberFingerprint(
  filepath: string,
  fingerprint: string,
  signature: Omit<CachedFingerprint, 'fingerprint'>,
) {
  imageFingerprintCache.delete(filepath);
  imageFingerprintCache.set(filepath, { fingerprint, ...signature });
  while (imageFingerprintCache.size > FINGERPRINT_CACHE_MAX_ENTRIES) {
    const oldestPath = imageFingerprintCache.keys().next().value as string | undefined;
    if (!oldestPath) break;
    imageFingerprintCache.delete(oldestPath);
  }
}

export async function getFileFingerprint(filepath: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await stat(filepath);
    const beforeSignature = getFileMetadataSignature(before);
    const cached = imageFingerprintCache.get(filepath);
    if (cached && metadataMatches(cached, beforeSignature)) {
      imageFingerprintCache.delete(filepath);
      imageFingerprintCache.set(filepath, cached);
      return cached.fingerprint;
    }

    const data = await readFile(filepath);
    const after = await stat(filepath);
    const afterSignature = getFileMetadataSignature(after);
    if (!metadataMatches({ fingerprint: '', ...beforeSignature }, afterSignature)) continue;

    const fingerprint = createHash('sha256').update(data).digest('hex');
    rememberFingerprint(filepath, fingerprint, afterSignature);
    return fingerprint;
  }

  throw new Error(`Image changed while fingerprinting: ${filepath}`);
}

function getStaticImagePath(rawUrl: string): StaticImagePath | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, 'http://local.invalid');
  } catch {
    return null;
  }
  if (parsed.origin !== 'http://local.invalid') return null;

  let area: 'blog' | 'lore';
  let rawRelativePath: string;
  if (parsed.pathname.startsWith('/blog/')) {
    area = 'blog';
    rawRelativePath = parsed.pathname.slice('/blog/'.length);
  } else if (parsed.pathname.startsWith('/lore/')) {
    area = 'lore';
    rawRelativePath = parsed.pathname.slice('/lore/'.length);
  } else {
    return null;
  }

  const segments: string[] = [];
  for (const rawSegment of rawRelativePath.split('/')) {
    if (!rawSegment) continue;
    let segment: string;
    try {
      segment = decodeURIComponent(rawSegment);
    } catch {
      return null;
    }
    if (
      segment === '.' ||
      segment === '..' ||
      segment.includes('/') ||
      segment.includes('\\') ||
      segment.includes('\0')
    ) {
      return null;
    }
    segments.push(segment);
  }

  if (segments.length === 0) return null;

  const root = resolve(process.cwd(), 'public', area);
  const filepath = resolve(root, ...segments);
  const relativePath = relative(root, filepath);
  if (relativePath === '' || relativePath.startsWith(`..${sep}`) || relativePath === '..')
    return null;

  return { filepath };
}

function withFingerprint(rawUrl: string, fingerprint: string): string {
  const parsed = new URL(rawUrl, 'http://local.invalid');
  parsed.searchParams.delete('v');
  parsed.searchParams.set('v', fingerprint);
  const query = parsed.searchParams.toString();
  return `${parsed.pathname}${query ? `?${query}` : ''}${parsed.hash}`;
}

/**
 * Add or refresh the file-content fingerprint on a local Blog/Lore source URL.
 * External, unsupported, and missing files stay valid legacy URLs.
 */
export async function fingerprintImageSource(rawUrl: string): Promise<string> {
  const staticPath = getStaticImagePath(rawUrl);
  if (!staticPath) return rawUrl;

  try {
    const fingerprint = await getFileFingerprint(staticPath.filepath);
    return withFingerprint(rawUrl, fingerprint);
  } catch {
    return rawUrl;
  }
}

export async function getFingerprintedPlaceholderImageUrl(): Promise<string> {
  return transformPostImageUrl(await fingerprintImageSource(POST_COVER_PLACEHOLDER_IMAGE));
}

async function fingerprintImageTokens(markdown: string): Promise<string> {
  const matches = [...markdown.matchAll(/\{\{\s*image\s*:\s*([^}]+?)\s*\}\}/gi)];
  if (matches.length === 0) return markdown;

  const replacements = await Promise.all(
    matches.map(async (match) => {
      const token = match[0];
      const rawPath = match[1]?.trim();
      if (!token || !rawPath) return [token ?? '', token ?? ''] as const;
      const versionedPath = await fingerprintImageSource(rawPath);
      return [token, token.replace(rawPath, versionedPath)] as const;
    }),
  );

  let output = markdown;
  for (const [source, replacement] of replacements) {
    if (source && source !== replacement) output = output.replace(source, replacement);
  }
  return output;
}

export async function fingerprintPostImages(
  post: ParsedPost,
  placeholderSource: string = POST_COVER_PLACEHOLDER_IMAGE,
): Promise<ParsedPost> {
  const sourceCover = post.metadata.cover_image?.trim() || placeholderSource;
  const [coverImage, content] = await Promise.all([
    fingerprintImageSource(sourceCover),
    fingerprintImageTokens(post.content),
  ]);

  return {
    ...post,
    metadata: { ...post.metadata, cover_image: coverImage },
    content,
    rawMarkdown: post.rawMarkdown === post.content ? content : post.rawMarkdown,
  };
}

export async function fingerprintPosts(posts: readonly ParsedPost[]): Promise<ParsedPost[]> {
  return Promise.all(posts.map((post) => fingerprintPostImages(post)));
}

export async function fingerprintArchivePeriods(
  periods: readonly ArchivePeriod[],
): Promise<ArchivePeriod[]> {
  return Promise.all(
    periods.map(async (period) => ({
      ...period,
      imageCandidates: await Promise.all(
        getPeriodImageCandidates(period.newestMonth, period.year).map(async (candidate) =>
          transformPostImageUrl(await fingerprintImageSource(candidate)),
        ),
      ),
    })),
  );
}

export async function fingerprintLoreGameGroups(
  groups: readonly LoreGameGroup[],
): Promise<LoreGameGroup[]> {
  return Promise.all(
    groups.map(async (group) => {
      const [posts, coverImage] = await Promise.all([
        fingerprintPosts(group.posts),
        group.game.coverImage
          ? fingerprintImageSource(group.game.coverImage)
          : Promise.resolve(undefined),
      ]);
      return {
        ...group,
        game: { ...group.game, coverImage },
        posts,
      };
    }),
  );
}

export async function fingerprintSpeciesCareCards(
  cards: SpeciesCareCardEmbedMap,
): Promise<SpeciesCareCardEmbedMap> {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(cards).map(async ([key, card]) => {
        const slug = card.record?.slug;
        if (card.status !== 'loaded' || !slug) return [key, card] as const;

        const [photoUrl, backgroundPhotoUrl] = await Promise.all([
          fingerprintImageSource(`/lore/species-photos/${slug}.png`),
          fingerprintImageSource(`/lore/species-photos/backgrounds/${slug}-signing.png`),
        ]);
        return [
          key,
          {
            ...card,
            photoUrl: transformPostImageUrl(photoUrl),
            backgroundPhotoUrl: transformPostImageUrl(backgroundPhotoUrl),
          },
        ] as const;
      }),
    ),
  );
}

export function clearImageFingerprintCacheForTests(): void {
  imageFingerprintCache.clear();
}
