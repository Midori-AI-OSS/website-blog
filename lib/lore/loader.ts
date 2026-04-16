/**
 * Lore Post Loader Service
 * Loads, sorts, and paginates lore posts from the filesystem.
 *
 * Mirrors the blog loader, but reads from lore/posts/.
 */

import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { parsePost, type ParsedPost } from '@/lib/blog/parser';
import { getPublishState } from '@/lib/content/publish';

const POSTS_DIR = join(process.cwd(), 'lore/posts');
const DEFAULT_PAGE_SIZE = 10;

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

function isValidFilename(filename: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.md$/i.test(filename);
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

export async function loadAllLorePosts(
  options: LoadAllLorePostsOptions = {},
  postsDir: string = POSTS_DIR
): Promise<ParsedPost[]> {
  try {
    const files = await readdir(postsDir);
    const mdFiles = files.filter(f => isValidFilename(f));

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

    // Sort newest -> oldest by displayed date (expected YYYY-MM-DD).
    // Invalid/missing dates sort last. Tie-break by filename for stability.
    parsedPosts.sort((a, b) => {
      const dateA = parseYYYYMMDDToUtcMs(a.parsed.metadata.date);
      const dateB = parseYYYYMMDDToUtcMs(b.parsed.metadata.date);

      if (dateA === null && dateB === null) return a.parsed.filename.localeCompare(b.parsed.filename);
      if (dateA === null) return 1;
      if (dateB === null) return -1;

      if (dateA !== dateB) return dateB - dateA;
      return a.parsed.filename.localeCompare(b.parsed.filename);
    });

    if (options.includeScheduled) {
      return parsedPosts.map((post) => post.parsed);
    }

    return parsedPosts.filter((post) =>
      getPublishState(post.explicitPublishDate, options.now).isPublished
    ).map((post) => post.parsed);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error loading lore posts:', errorMessage);
    return [];
  }
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
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    console.warn(`Invalid lore slug format: ${slug}`);
    return null;
  }

  return allPosts.find(p => p.filename === `${slug}.md`) || null;
}
