# Task 06: Post Loader Service - COMPLETED ✅

**Completed:** 2026-01-18  
**Files Created:** 4 new files + updated README

## What Was Built

A complete post loader service for loading, sorting, and paginating blog posts from the filesystem.

### Files Created

1. **lib/blog/loader.ts** (7.4 KB)
   - Main loader service with all core functionality
   - Security features (filename validation, path traversal prevention)
   - Error handling (missing files, corrupted markdown, empty directory)
   - Caching support for SSR/API routes

2. **lib/blog/loader.test.ts** (5.9 KB)
   - Comprehensive test suite (11 tests)
   - Tests all core functionality
   - Security tests

3. **lib/blog/verify-loader.ts** (6.1 KB)
   - Manual verification script
   - Can be run with: `npx tsx lib/blog/verify-loader.ts`

4. **lib/blog/loader-examples.ts** (7.7 KB)
   - Complete usage examples
   - Next.js integration examples (SSG, SSR, API Routes)
   - Real-world patterns

5. **lib/blog/README.md** (updated)
   - Added loader documentation
   - Usage examples
   - API reference

## Features Implemented

### Core Features
- ✅ Load all markdown posts from `blog/posts/`
- ✅ Sort posts by date (newest first)
- ✅ Pagination with configurable page size
- ✅ Single post lookup by slug
- ✅ Filter posts by tag
- ✅ Get all unique tags
- ✅ Get recent posts

### Security
- ✅ Filename validation (YYYY-MM-DD.md only)
- ✅ Path traversal prevention (realpath checks)
- ✅ Input sanitization
- ✅ Slug format validation

### Error Handling
- ✅ Graceful handling of missing files
- ✅ Corrupted markdown handling
- ✅ Empty directory handling
- ✅ Never crashes on errors

### Performance
- ✅ Parallel file loading (Promise.all)
- ✅ Optional caching for SSR (1-minute TTL)
- ✅ Efficient filtering and sorting

## API Functions

```typescript
loadAllPosts()              // Load all posts from filesystem
loadAllPostsCached()        // Load with caching (SSR/API)
paginatePosts()            // Paginate results
getPostBySlug()            // Get single post by date slug
getPostsByTag()            // Filter by tag
getAllTags()               // Get all unique tags
getRecentPosts()           // Get N most recent posts
clearCache()               // Clear the cache
```

## Integration

Works seamlessly with:
- ✅ Parser from Task 05 (`parsePost`)
- ✅ Next.js 13+ App Router (SSG)
- ✅ Next.js API Routes (with caching)
- ✅ react-markdown for rendering

## Testing

All tests passed ✅

```bash
npx tsx lib/blog/verify-loader.ts
```

Test coverage:
- Load all posts (with invalid filename filtering)
- Pagination (page sizes, hasMore flag)
- Find post by slug
- Filter by tag (case-insensitive)
- Get all tags (unique, sorted)
- Recent posts
- Security: Invalid slug rejection
- Empty directory handling

## Example Usage

```typescript
import { loadAllPosts, paginatePosts } from '@/lib/blog/loader';

const posts = await loadAllPosts();
const page = paginatePosts(posts, 0, 10);

// Returns:
// {
//   posts: [...],
//   hasMore: true,
//   totalCount: 25,
//   currentPage: 0,
//   totalPages: 3
// }
```

## Success Criteria (All Met)

- [x] Loader file created in correct location
- [x] Lists all markdown files in `blog/posts/`
- [x] **SECURITY:** Validates filename format (YYYY-MM-DD.md only)
- [x] **SECURITY:** Prevents path traversal attacks
- [x] Correctly extracts dates from filenames
- [x] Sorts newest to oldest
- [x] Pagination returns correct number of posts
- [x] Returns `hasMore` flag for infinite scroll
- [x] **ERROR HANDLING:** Handles empty directory gracefully
- [x] **ERROR HANDLING:** Handles corrupted/missing files without crashing
- [x] Implementation matches rendering strategy (SSG/SSR)
- [x] Caching implemented (if server-side approach)
- [x] Integrates with parser from task 05 successfully

## Next Steps

The loader is ready to be used in:
- Blog listing pages
- Single post pages
- API endpoints
- Tag filtering pages
- Recent posts sidebars

No additional setup required - just import and use!
