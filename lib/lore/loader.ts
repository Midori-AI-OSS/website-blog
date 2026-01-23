/**
 * Lore Post Loader Service
 * Loads, sorts, and paginates lore posts from the filesystem.
 *
 * Mirrors the blog loader, but reads from lore/posts/.
 */

import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { parsePost, type ParsedPost } from '@/lib/blog/parser';

const POSTS_DIR = join(process.cwd(), 'lore/posts');
const DEFAULT_PAGE_SIZE = 10;

export interface PaginatedLorePosts {
  posts: ParsedPost[];
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

function isValidFilename(filename: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.md$/i.test(filename);
}

export async function loadAllLorePosts(): Promise<ParsedPost[]> {
  try {
    const files = await readdir(POSTS_DIR);
    const mdFiles = files.filter(f => isValidFilename(f));

    if (mdFiles.length === 0) {
      console.info('No valid markdown files found in lore/posts/');
      return [];
    }

    const realPostsDir = await realpath(POSTS_DIR);

    const posts = await Promise.all(
      mdFiles.map(async (filename) => {
        try {
          const filepath = join(POSTS_DIR, filename);
          const realFilePath = await realpath(filepath);
          if (!realFilePath.startsWith(realPostsDir)) {
            console.error(`Security: Path traversal attempt detected for ${filename}`);
            return null;
          }

          const content = await readFile(filepath, 'utf-8');
          const parsed = parsePost(filename, content);

          // Ensure lore posts have a stable date for SSR/CSR consistency (prevents hydration mismatch).
          if (!parsed.metadata.date) {
            const fileStat = await stat(filepath);
            parsed.metadata.date = fileStat.mtime.toISOString().slice(0, 10);
          }

          return parsed;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error loading ${filename}:`, errorMessage);
          return null;
        }
      })
    );

    return posts.filter((p): p is ParsedPost => p !== null);
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
