# Task: Create Post Loader Service

## Objective
Build a service to load blog posts from `blog/posts/`, sort by date, and support pagination.

## Prerequisites
- Task 05 completed (parser created)
- Know rendering strategy from technical decisions (SSG/SSR/CSR)

## Requirements
- Read all `.md` files from `blog/posts/`
- Extract date from filename (YYYY-MM-DD.md format)
- **SECURITY:** Validate filename format, prevent path traversal
- Sort posts by date (newest first)
- Support pagination (10 posts per page)
- **ERROR HANDLING:** Handle missing files, corrupted markdown
- Implementation depends on rendering strategy (see below)

## Steps

### 1. Choose Implementation Approach (from technical decisions)

**Option A: SSG/Build-time (Recommended for blogs)**
- Load all posts at build time
- Generate static JSON or embed in bundle
- Fast client-side access

**Option B: SSR/Server-side**
- Load posts on each request
- Use filesystem API in API routes
- Fresh data on every request

**Option C: CSR/Client-side**
- API endpoint serves posts
- Client fetches via HTTP
- Dynamic loading

### 2. Create loader file:
- `lib/blog/loader.ts` OR `utils/blog/loader.ts`

### 3. Implement for chosen approach:

**For SSG (Next.js, Vite with plugin):**
```typescript
import fs from 'fs/promises';
import path from 'path';
import { parsePost, ParsedPost } from './parser';

const POSTS_DIR = path.join(process.cwd(), 'blog/posts');

interface PaginatedPosts {
  posts: ParsedPost[];
  hasMore: boolean;
  totalCount: number;
}

// Validate filename format (security)
function isValidFilename(filename: string): boolean {
  return /^\d{4}-\d{2}-\d{2}\.md$/.test(filename);
}

// Extract date safely
function extractDateFromFilename(filename: string): Date {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})\.md$/);
  if (!match) throw new Error(`Invalid filename format: ${filename}`);
  
  const [, year, month, day] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Load all posts at build time
export async function loadAllPosts(): Promise<ParsedPost[]> {
  try {
    // Read directory
    const files = await fs.readdir(POSTS_DIR);
    
    // Filter and validate files
    const mdFiles = files.filter(f => isValidFilename(f));
    
    // Load and parse posts
    const posts = await Promise.all(
      mdFiles.map(async (filename) => {
        try {
          const filepath = path.join(POSTS_DIR, filename);
          // Security: ensure path is within POSTS_DIR
          const realPath = await fs.realpath(filepath);
          if (!realPath.startsWith(await fs.realpath(POSTS_DIR))) {
            throw new Error('Path traversal attempt detected');
          }
          
          const content = await fs.readFile(filepath, 'utf-8');
          return parsePost(filename, content);
        } catch (error) {
          console.error(`Error loading ${filename}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed loads and sort
    return posts
      .filter((p): p is ParsedPost => p !== null)
      .sort((a, b) => {
        const dateA = extractDateFromFilename(a.filename);
        const dateB = extractDateFromFilename(b.filename);
        return dateB.getTime() - dateA.getTime(); // Newest first
      });
  } catch (error) {
    console.error('Error loading posts:', error);
    return [];
  }
}

// Paginate posts
export function paginatePosts(
  allPosts: ParsedPost[],
  page: number,
  pageSize: number = 10
): PaginatedPosts {
  const start = page * pageSize;
  const end = start + pageSize;
  
  return {
    posts: allPosts.slice(start, end),
    hasMore: end < allPosts.length,
    totalCount: allPosts.length,
  };
}

// Get single post by slug (date)
export function getPostBySlug(
  allPosts: ParsedPost[],
  slug: string
): ParsedPost | null {
  return allPosts.find(p => p.filename === `${slug}.md`) || null;
}
```

**For SSR (API Route):**
```typescript
// pages/api/posts.ts or app/api/posts/route.ts
import { loadAllPosts, paginatePosts } from '@/lib/blog/loader';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0');
  
  const allPosts = await loadAllPosts();
  const result = paginatePosts(allPosts, page);
  
  return Response.json(result);
}
```

### 4. Add caching (if SSR/API):
```typescript
let postsCache: ParsedPost[] | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60000; // 1 minute

export async function loadAllPostsCached(): Promise<ParsedPost[]> {
  const now = Date.now();
  if (postsCache && now - cacheTime < CACHE_TTL) {
    return postsCache;
  }
  
  postsCache = await loadAllPosts();
  cacheTime = now;
  return postsCache;
}
```

## Success Criteria
- [ ] Loader file created in correct location
- [ ] Lists all markdown files in `blog/posts/`
- [ ] **SECURITY:** Validates filename format (YYYY-MM-DD.md only)
- [ ] **SECURITY:** Prevents path traversal attacks
- [ ] Correctly extracts dates from filenames
- [ ] Sorts newest to oldest
- [ ] Pagination returns correct number of posts
- [ ] Returns `hasMore` flag for infinite scroll
- [ ] **ERROR HANDLING:** Handles empty directory gracefully
- [ ] **ERROR HANDLING:** Handles corrupted/missing files without crashing
- [ ] Implementation matches rendering strategy from technical decisions
- [ ] Caching implemented (if server-side approach)
- [ ] Integrates with parser from task 05 successfully

## Example
```javascript
const result = await loadPosts(0, 10);
// Returns:
// {
//   posts: [...10 newest posts...],
//   hasMore: true,
//   totalCount: 25
// }
```
