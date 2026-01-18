/**
 * Blog Post Loader Service
 * Loads, sorts, and paginates blog posts from the filesystem
 * 
 * SECURITY FEATURES:
 * - Filename validation to prevent path traversal
 * - Real path verification
 * - Input sanitization
 * 
 * ERROR HANDLING:
 * - Graceful handling of missing files
 * - Corrupted markdown file handling
 * - Empty directory handling
 */

import { readdir, readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { parsePost, type ParsedPost } from './parser';

const POSTS_DIR = join(process.cwd(), 'blog/posts');
const DEFAULT_PAGE_SIZE = 10;

/**
 * Paginated posts result
 */
export interface PaginatedPosts {
  posts: ParsedPost[];
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Validate filename format (security)
 * Only allows YYYY-MM-DD.md format to prevent path traversal
 * 
 * @param filename - The filename to validate
 * @returns true if valid format, false otherwise
 */
function isValidFilename(filename: string): boolean {
  return /^\d{4}-\d{2}-\d{2}\.md$/.test(filename);
}

/**
 * Extract date from filename safely
 * 
 * @param filename - The filename in YYYY-MM-DD.md format
 * @returns Date object
 * @throws Error if filename format is invalid
 */
function extractDateFromFilename(filename: string): Date {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})\.md$/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid filename format: ${filename}`);
  }
  
  const [, year, month, day] = match;
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
}

/**
 * Load all posts from the blog/posts directory
 * 
 * SECURITY:
 * - Validates filename format
 * - Prevents path traversal attacks
 * 
 * ERROR HANDLING:
 * - Returns empty array if directory doesn't exist
 * - Logs errors but continues processing other files
 * - Filters out failed loads
 * 
 * @returns Array of parsed posts, sorted newest to oldest
 */
export async function loadAllPosts(): Promise<ParsedPost[]> {
  try {
    // Read directory
    const files = await readdir(POSTS_DIR);
    
    // Filter and validate files (security: only YYYY-MM-DD.md format)
    const mdFiles = files.filter(f => isValidFilename(f));
    
    if (mdFiles.length === 0) {
      console.info('No valid markdown files found in blog/posts/');
      return [];
    }
    
    // Get real path of posts directory for security check
    const realPostsDir = await realpath(POSTS_DIR);
    
    // Load and parse posts in parallel
    const posts = await Promise.all(
      mdFiles.map(async (filename) => {
        try {
          const filepath = join(POSTS_DIR, filename);
          
          // Security: ensure path is within POSTS_DIR (prevent path traversal)
          const realFilePath = await realpath(filepath);
          if (!realFilePath.startsWith(realPostsDir)) {
            console.error(`Security: Path traversal attempt detected for ${filename}`);
            return null;
          }
          
          // Read file content
          const content = await readFile(filepath, 'utf-8');
          
          // Parse the post
          return parsePost(filename, content);
        } catch (error) {
          // Error handling: log but don't crash, continue with other files
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error loading ${filename}:`, errorMessage);
          return null;
        }
      })
    );
    
    // Filter out failed loads and sort by date (newest first)
    return posts
      .filter((p): p is ParsedPost => p !== null)
      .sort((a, b) => {
        try {
          const dateA = extractDateFromFilename(a.filename);
          const dateB = extractDateFromFilename(b.filename);
          return dateB.getTime() - dateA.getTime(); // Newest first
        } catch (error) {
          console.error('Error sorting posts:', error);
          return 0; // Keep original order on error
        }
      });
  } catch (error) {
    // Error handling: empty directory or permissions issue
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error loading posts:', errorMessage);
    return [];
  }
}

/**
 * Paginate posts
 * 
 * @param allPosts - Array of all posts
 * @param page - Page number (0-indexed)
 * @param pageSize - Number of posts per page (default: 10)
 * @returns Paginated posts with metadata
 */
export function paginatePosts(
  allPosts: ParsedPost[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginatedPosts {
  // Validate inputs
  const safePage = Math.max(0, page);
  const safePageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 posts per page
  
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

/**
 * Get single post by slug (date in YYYY-MM-DD format)
 * 
 * @param allPosts - Array of all posts
 * @param slug - The date slug (YYYY-MM-DD)
 * @returns Found post or null
 */
export function getPostBySlug(
  allPosts: ParsedPost[],
  slug: string
): ParsedPost | null {
  // Validate slug format (security)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slug)) {
    console.warn(`Invalid slug format: ${slug}`);
    return null;
  }
  
  return allPosts.find(p => p.filename === `${slug}.md`) || null;
}

/**
 * Get posts by tag
 * 
 * @param allPosts - Array of all posts
 * @param tag - The tag to filter by
 * @returns Array of posts with the specified tag
 */
export function getPostsByTag(
  allPosts: ParsedPost[],
  tag: string
): ParsedPost[] {
  if (!tag || typeof tag !== 'string') {
    return [];
  }
  
  const normalizedTag = tag.toLowerCase().trim();
  
  return allPosts.filter(post => 
    post.metadata.tags?.some(t => t.toLowerCase() === normalizedTag)
  );
}

/**
 * Get all unique tags from all posts
 * 
 * @param allPosts - Array of all posts
 * @returns Array of unique tags, sorted alphabetically
 */
export function getAllTags(allPosts: ParsedPost[]): string[] {
  const tagsSet = new Set<string>();
  
  allPosts.forEach(post => {
    post.metadata.tags?.forEach(tag => {
      if (tag && typeof tag === 'string') {
        tagsSet.add(tag.trim());
      }
    });
  });
  
  return Array.from(tagsSet).sort();
}

/**
 * Get recent posts (for sidebar or homepage)
 * 
 * @param allPosts - Array of all posts
 * @param limit - Number of posts to return (default: 5)
 * @returns Array of recent posts
 */
export function getRecentPosts(
  allPosts: ParsedPost[],
  limit: number = 5
): ParsedPost[] {
  return allPosts.slice(0, Math.max(1, limit));
}

// Cache for SSR/API routes (optional)
let postsCache: ParsedPost[] | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load all posts with caching (for SSR/API routes)
 * 
 * @returns Array of parsed posts (cached)
 */
export async function loadAllPostsCached(): Promise<ParsedPost[]> {
  const now = Date.now();
  
  // Return cached posts if still valid
  if (postsCache && now - cacheTime < CACHE_TTL) {
    return postsCache;
  }
  
  // Load fresh posts
  postsCache = await loadAllPosts();
  cacheTime = now;
  
  return postsCache;
}

/**
 * Clear the posts cache (useful for invalidation)
 */
export function clearCache(): void {
  postsCache = null;
  cacheTime = 0;
}
