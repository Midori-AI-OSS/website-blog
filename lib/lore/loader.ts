/**
 * Lore Post Loader Service
 * Loads, sorts, groups, and paginates lore posts from the filesystem.
 */

import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { parsePost, type ParsedPost } from '@/lib/blog/parser';
import { getPublishState } from '@/lib/content/publish';

const POSTS_DIR = join(process.cwd(), 'lore/posts');
const GAMES_DIR = join(process.cwd(), 'lore/games');
const DEFAULT_PAGE_SIZE = 10;

const LORE_ROOT_TAG = 'lore';

export interface PaginatedLorePosts {
  posts: ParsedPost[];
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface LoadAllLorePostsOptions {
  includeScheduled?: boolean;
  now?: Date | string;
}

export interface LoreGameIndex {
  slug: string;
  title: string;
  summary: string;
  coverImage?: string;
  fullStoryPov: string;
  fullStoryTooltip?: string;
}

export interface LoreGameGroup {
  game: LoreGameIndex;
  posts: ParsedPost[];
  characters: string[];
}

export type LorePostSortMode =
  | 'story_order_desc'
  | 'story_order_asc'
  | 'date_desc'
  | 'date_asc';

export interface LorePostNeighbor {
  post: ParsedPost;
  slug: string;
}

export interface LorePostNeighbors {
  previous: LorePostNeighbor | null;
  next: LorePostNeighbor | null;
}

function isValidFilename(filename: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.md$/i.test(filename);
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/i.test(value);
}

function normalizeSlug(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!isValidSlug(trimmed)) return null;
  return trimmed;
}

function parseYYYYMMDDToUtcMs(dateString: string | undefined): number | null {
  if (!dateString) return null;

  const trimmed = dateString.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);

  // Guard against invalid dates like 2025-02-30 rolling over.
  if (date.getUTCFullYear() !== year) return null;
  if (date.getUTCMonth() !== month - 1) return null;
  if (date.getUTCDate() !== day) return null;

  return ms;
}

function getStoryOrderValue(post: ParsedPost): number | null {
  const value = post.metadata.story_order;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function compareByDisplayDateDesc(a: ParsedPost, b: ParsedPost): number {
  const dateA = parseYYYYMMDDToUtcMs(a.metadata.date);
  const dateB = parseYYYYMMDDToUtcMs(b.metadata.date);

  if (dateA === null && dateB === null) return a.filename.localeCompare(b.filename);
  if (dateA === null) return 1;
  if (dateB === null) return -1;

  if (dateA !== dateB) return dateB - dateA;
  return a.filename.localeCompare(b.filename);
}

function compareByDisplayDateAsc(a: ParsedPost, b: ParsedPost): number {
  return compareByDisplayDateDesc(b, a);
}

function compareByStoryOrderAsc(a: ParsedPost, b: ParsedPost): number {
  const orderA = getStoryOrderValue(a);
  const orderB = getStoryOrderValue(b);

  if (orderA === null && orderB === null) return compareByDisplayDateAsc(a, b);
  if (orderA === null) return 1;
  if (orderB === null) return -1;
  if (orderA !== orderB) return orderA - orderB;

  const dateA = parseYYYYMMDDToUtcMs(a.metadata.date);
  const dateB = parseYYYYMMDDToUtcMs(b.metadata.date);
  if (dateA !== null && dateB !== null && dateA !== dateB) return dateA - dateB;

  return a.filename.localeCompare(b.filename);
}

function compareByStoryOrderDesc(a: ParsedPost, b: ParsedPost): number {
  return compareByStoryOrderAsc(b, a);
}

function normalizeTags(post: ParsedPost): string[] {
  return (post.metadata.tags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function getGameTagFromPost(post: ParsedPost): string | null {
  return normalizeSlug(post.metadata.game);
}

function hasTag(post: ParsedPost, tag: string): boolean {
  const target = tag.trim().toLowerCase();
  if (!target) return false;
  return normalizeTags(post).includes(target);
}

function ensureRequiredLoreMetadata(parsed: ParsedPost): boolean {
  const game = normalizeSlug(parsed.metadata.game);
  if (!game) {
    console.error(`Lore post ${parsed.filename} is missing required "game" frontmatter.`);
    return false;
  }

  const storyOrder = getStoryOrderValue(parsed);
  if (storyOrder === null) {
    console.error(`Lore post ${parsed.filename} is missing required numeric "story_order" frontmatter.`);
    return false;
  }

  parsed.metadata.game = game;
  parsed.metadata.story_order = storyOrder;
  return true;
}

export function getLorePostSlug(post: ParsedPost): string {
  return post.filename.replace(/\.md$/i, '');
}

export function sortLorePosts(posts: ParsedPost[], mode: LorePostSortMode): ParsedPost[] {
  const sorted = [...posts];

  switch (mode) {
    case 'story_order_asc':
      sorted.sort(compareByStoryOrderAsc);
      break;
    case 'story_order_desc':
      sorted.sort(compareByStoryOrderDesc);
      break;
    case 'date_asc':
      sorted.sort(compareByDisplayDateAsc);
      break;
    case 'date_desc':
    default:
      sorted.sort(compareByDisplayDateDesc);
      break;
  }

  return sorted;
}

export function deriveLoreCharacters(posts: ParsedPost[], gameSlug: string): string[] {
  const normalizedGame = gameSlug.trim().toLowerCase();
  const characters = new Map<string, string>();

  for (const post of posts) {
    for (const rawTag of post.metadata.tags ?? []) {
      const normalized = rawTag.trim().toLowerCase();
      if (!normalized) continue;
      if (normalized === LORE_ROOT_TAG) continue;
      if (normalized === normalizedGame) continue;
      if (!characters.has(normalized)) {
        characters.set(normalized, rawTag.trim());
      }
    }
  }

  return Array.from(characters.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

export function getPostCharacterTags(post: ParsedPost, gameSlug: string): string[] {
  const normalizedGame = gameSlug.trim().toLowerCase()
  return normalizeTags(post).filter((tag) => tag !== LORE_ROOT_TAG && tag !== normalizedGame)
}

export function getLoreStoryNeighbors(
  posts: ParsedPost[],
  currentPost: ParsedPost,
  characterTags?: string[]
): LorePostNeighbors {
  const currentGame = normalizeSlug(currentPost.metadata.game);
  if (!currentGame) {
    return {
      previous: null,
      next: null,
    };
  }

  const characterFilter = characterTags ?? getPostCharacterTags(currentPost, currentGame)
  const hasCharacterFilter = characterFilter.length > 0

  const candidates = sortLorePosts(
    posts.filter((post) => {
      if (normalizeSlug(post.metadata.game) !== currentGame) return false
      if (!hasCharacterFilter) return true
      return characterFilter.some((tag) => hasTag(post, tag))
    }),
    'story_order_asc'
  );

  const currentIndex = candidates.findIndex((post) => post.filename === currentPost.filename);
  if (currentIndex < 0) {
    return {
      previous: null,
      next: null,
    };
  }

  const previousPost = currentIndex > 0 ? candidates[currentIndex - 1] : null;
  const nextPost = currentIndex < candidates.length - 1 ? candidates[currentIndex + 1] : null;

  return {
    previous: previousPost
      ? {
          post: previousPost,
          slug: getLorePostSlug(previousPost),
        }
      : null,
    next: nextPost
      ? {
          post: nextPost,
          slug: getLorePostSlug(nextPost),
        }
      : null,
  };
}

export function getLorePovPosts(posts: ParsedPost[], gameSlug: string, pov: string): ParsedPost[] {
  const normalizedGame = normalizeSlug(gameSlug);
  const normalizedPov = pov.trim().toLowerCase();

  if (!normalizedGame || !normalizedPov) return [];

  const sameGame = posts.filter((post) => normalizeSlug(post.metadata.game) === normalizedGame);
  return sortLorePosts(
    sameGame.filter((post) => hasTag(post, normalizedPov)),
    'story_order_asc'
  );
}

export function getLorePostsForGame(posts: ParsedPost[], gameSlug: string): ParsedPost[] {
  const normalizedGame = normalizeSlug(gameSlug);
  if (!normalizedGame) return [];
  return posts.filter((post) => normalizeSlug(post.metadata.game) === normalizedGame);
}

export async function loadAllLorePosts(
  options: LoadAllLorePostsOptions = {},
  postsDir: string = POSTS_DIR
): Promise<ParsedPost[]> {
  try {
    const files = await readdir(postsDir);
    const mdFiles = files.filter((f) => isValidFilename(f));

    if (mdFiles.length === 0) {
      console.info(`No valid markdown files found in ${postsDir}`);
      return [];
    }

    const realPostsDir = await realpath(postsDir);

    const posts = await Promise.all(
      mdFiles.map(async (filename) => {
        try {
          const filepath = join(postsDir, filename);
          const realFilePath = await realpath(filepath);
          if (!realFilePath.startsWith(realPostsDir)) {
            console.error(`Security: Path traversal attempt detected for ${filename}`);
            return null;
          }

          const content = await readFile(filepath, 'utf-8');
          const parsed = parsePost(filename, content);
          if (!ensureRequiredLoreMetadata(parsed)) {
            return null;
          }

          const explicitPublishDate = parsed.metadata.date;

          // Ensure lore posts have a stable date for SSR/CSR consistency (prevents hydration mismatch).
          if (!parsed.metadata.date) {
            const fileStat = await stat(filepath);
            parsed.metadata.date = fileStat.mtime.toISOString().slice(0, 10);
          }

          return {
            parsed,
            explicitPublishDate,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error loading ${filename}:`, errorMessage);
          return null;
        }
      })
    );

    const parsedPosts = posts.filter(
      (
        post
      ): post is {
        parsed: ParsedPost;
        explicitPublishDate: string | undefined;
      } => post !== null
    );

    parsedPosts.sort((a, b) => compareByDisplayDateDesc(a.parsed, b.parsed));

    if (options.includeScheduled) {
      return parsedPosts.map((post) => post.parsed);
    }

    return parsedPosts
      .filter((post) => getPublishState(post.explicitPublishDate, options.now).isPublished)
      .map((post) => post.parsed);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error loading lore posts:', errorMessage);
    return [];
  }
}

export async function loadLoreGameIndexes(gamesDir: string = GAMES_DIR): Promise<LoreGameIndex[]> {
  try {
    const dirEntries = await readdir(gamesDir, { withFileTypes: true });
    const directories = dirEntries.filter((entry) => entry.isDirectory());

    const realGamesDir = await realpath(gamesDir);
    const indexes = await Promise.all(
      directories.map(async (directory) => {
        const slug = normalizeSlug(directory.name);
        if (!slug) {
          console.error(`Skipping invalid game directory slug: ${directory.name}`);
          return null;
        }

        const gameDirPath = join(gamesDir, directory.name);
        const realGameDirPath = await realpath(gameDirPath);
        if (!realGameDirPath.startsWith(realGamesDir)) {
          console.error(`Security: Path traversal attempt detected for game dir ${directory.name}`);
          return null;
        }

        const indexPath = join(gameDirPath, 'index.md');
        const content = await readFile(indexPath, 'utf-8');
        const parsed = parsePost(`${slug}/index.md`, content);

        const title = parsed.metadata.title?.trim();
        const summary = parsed.metadata.summary?.trim();
        const fullStoryPov = normalizeSlug(parsed.metadata.full_story_pov);

        if (!title) {
          console.error(`Game index ${indexPath} is missing required "title" field.`);
          return null;
        }

        if (!summary) {
          console.error(`Game index ${indexPath} is missing required "summary" field.`);
          return null;
        }

        if (!fullStoryPov) {
          console.error(`Game index ${indexPath} is missing required "full_story_pov" field.`);
          return null;
        }

        return {
          slug,
          title,
          summary,
          coverImage: parsed.metadata.cover_image?.trim(),
          fullStoryPov,
          fullStoryTooltip: parsed.metadata.full_story_tooltip?.trim() || undefined,
        } satisfies LoreGameIndex;
      })
    );

    const validIndexes: LoreGameIndex[] = [];
    for (const index of indexes) {
      if (index !== null) {
        validIndexes.push(index);
      }
    }

    return validIndexes.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error loading lore game indexes:', errorMessage);
    return [];
  }
}

export async function loadLoreGameGroups(
  options: LoadAllLorePostsOptions = {},
  postsDir: string = POSTS_DIR,
  gamesDir: string = GAMES_DIR
): Promise<LoreGameGroup[]> {
  const [allPosts, gameIndexes] = await Promise.all([
    loadAllLorePosts(options, postsDir),
    loadLoreGameIndexes(gamesDir),
  ]);

  const groups = gameIndexes.map((game) => {
    const gamePosts = sortLorePosts(getLorePostsForGame(allPosts, game.slug), 'story_order_desc');
    return {
      game,
      posts: gamePosts,
      characters: deriveLoreCharacters(gamePosts, game.slug),
    } satisfies LoreGameGroup;
  });

  return groups.sort((a, b) => {
    const latestA = a.posts[0];
    const latestB = b.posts[0];

    if (!latestA && !latestB) return a.game.title.localeCompare(b.game.title);
    if (!latestA) return 1;
    if (!latestB) return -1;

    return compareByDisplayDateDesc(latestA, latestB);
  });
}

export function paginateLorePosts(
  allPosts: ParsedPost[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginatedLorePosts {
  const safePage = Math.max(0, page);
  const safePageSize = Math.max(1, Math.min(100, pageSize));

  const start = safePage * safePageSize;
  const end = start + safePageSize;
  const totalPages = Math.ceil(allPosts.length / safePageSize);

  return {
    posts: allPosts.slice(start, end),
    hasMore: end < allPosts.length,
    totalCount: allPosts.length,
    currentPage: safePage,
    totalPages,
  };
}

export function getLorePostBySlug(allPosts: ParsedPost[], slug: string): ParsedPost | null {
  if (!isValidSlug(slug)) {
    console.warn(`Invalid lore slug format: ${slug}`);
    return null;
  }

  return allPosts.find((p) => p.filename === `${slug}.md`) || null;
}
