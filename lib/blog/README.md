# Blog Post System

A complete blog post system with markdown parsing, loading, and pagination utilities.

## Components

- **Parser** (`parser.ts`) - Parse markdown with front matter
- **Loader** (`loader.ts`) - Load, sort, and paginate posts from filesystem

---

## 📝 Markdown Parser

## Features

- ✅ Parse front matter with `---` delimiters (automatically supports `+++` too)
- ✅ Extract metadata: title, summary, tags, cover_image, date, author
- ✅ Handle posts without metadata (generates defaults)
- ✅ TypeScript type safety with full type definitions
- ✅ Graceful error handling (never crashes)
- ✅ Input validation and sanitization
- ✅ Unicode support (emoji, international characters)
- ✅ Security-conscious (metadata sanitization, raw markdown returned)

## Installation

Dependencies are already installed in this project:
- `gray-matter` - Front matter parsing
- `react-markdown` - Markdown rendering (used at component level)
- `rehype-sanitize` - HTML sanitization (used at component level)

## Usage

### Basic Usage

```typescript
import { parsePost } from './lib/blog/parser';

const content = `---
title: Hello World
summary: My first post
tags: [welcome, intro]
---

# Content here

This is my blog post.`;

const post = parsePost('2026-01-17.md', content);

console.log(post.metadata.title);     // "Hello World"
console.log(post.metadata.summary);   // "My first post"
console.log(post.metadata.tags);      // ["welcome", "intro"]
console.log(post.content);            // "# Content here\n\nThis is my blog post."
```

### Parse Multiple Posts

```typescript
import { parsePosts } from './lib/blog/parser';

const posts = [
  { filename: '2026-01-17.md', content: '...' },
  { filename: '2026-01-18.md', content: '...' }
];

const parsed = parsePosts(posts);
```

### Extract Metadata Only

Useful for listing posts without loading full content:

```typescript
import { extractMetadata } from './lib/blog/parser';

const metadata = extractMetadata('2026-01-17.md', fileContent);
console.log(metadata.title);
console.log(metadata.tags);
```

## API Reference

### `parsePost(filename: string, fileContent: string): ParsedPost`

Parses a markdown file with front matter.

**Parameters:**
- `filename` - The filename (e.g., "2026-01-17.md")
- `fileContent` - The raw content of the markdown file

**Returns:** `ParsedPost` object with:
- `metadata: PostMetadata` - Extracted and validated metadata
- `content: string` - Raw markdown content (ready for react-markdown)
- `rawMarkdown: string` - Same as content (for compatibility)
- `filename: string` - Original filename

### `parsePosts(posts: Array<{filename, content}>): ParsedPost[]`

Parse multiple posts at once.

### `extractMetadata(filename: string, fileContent: string): PostMetadata`

Extract only metadata without parsing content.

## Type Definitions

```typescript
interface PostMetadata {
  title: string;
  summary?: string;
  tags?: string[];
  cover_image?: string;
  date?: string;
  author?: string;
}

interface ParsedPost {
  metadata: PostMetadata;
  content: string;
  rawMarkdown: string;
  filename: string;
}
```

## Front Matter Format

The parser supports standard YAML front matter:

```markdown
---
title: My Blog Post
summary: A short description
tags: [javascript, typescript, tutorial]
cover_image: /images/cover.jpg
date: 2026-01-17
author: John Doe
---

Your markdown content here...
```

All fields except `title` are optional. If `title` is missing, it will be generated from the filename.

## Error Handling

The parser never throws errors. Invalid inputs return safe defaults:

```typescript
// Invalid input
const post = parsePost('error.md', null);

// Returns safe default:
{
  metadata: { title: 'Error', tags: [] },
  content: '',
  rawMarkdown: '',
  filename: 'error.md'
}
```

## Security

- **Metadata Sanitization**: All metadata values are trimmed and validated
- **No XSS in Parser**: The parser returns raw markdown (sanitization happens at render time with `rehype-sanitize`)
- **Input Validation**: Invalid metadata types are filtered or defaulted
- **No Code Execution**: Parser only reads and structures data

## Examples

### Post Without Metadata

```typescript
const content = '# Just Content\n\nNo front matter.';
const post = parsePost('2026-01-17.md', content);

// Generates title from filename
console.log(post.metadata.title); // "Post from 2026-01-17"
```

### Malformed Metadata

```typescript
const content = `---
title: Valid
tags: "not an array"
---
Content`;

const post = parsePost('test.md', content);

// Invalid tags are filtered
console.log(post.metadata.tags); // []
console.log(post.metadata.title); // "Valid"
```

### Unicode Support

```typescript
const content = `---
title: 你好世界 🌍
tags: [中文, 日本語, emoji-🎉]
---

Content with émojis 😀`;

const post = parsePost('unicode.md', content);
// All unicode is preserved correctly
```

## Testing

Manual verification:
```bash
node lib/blog/test-parser.mjs
```

Test suite available in `lib/blog/parser.test.ts` (requires test runner).

## File Structure

```
lib/blog/
├── parser.ts           # Main parser implementation
├── parser.test.ts      # Comprehensive test suite
├── test-parser.mjs     # Manual verification script
├── README.md           # This file
└── compiled/           # Compiled JavaScript (generated)
```

## Integration with React

Use with `react-markdown` in your components:

```tsx
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { parsePost } from '@/lib/blog/parser';

function BlogPost({ filename, content }) {
  const post = parsePost(filename, content);
  
  return (
    <div>
      <h1>{post.metadata.title}</h1>
      {post.metadata.summary && <p>{post.metadata.summary}</p>}
      
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
        {post.content}
      </ReactMarkdown>
    </div>
  );
}
```

---

## 📚 Post Loader

The loader service loads, sorts, and paginates blog posts from the filesystem.

### Features

- ✅ **SSG/Build-time Loading**: Load all posts at build time
- ✅ **Security**: Filename validation and path traversal prevention  
- ✅ **Pagination**: Support for paginated post lists
- ✅ **Sorting**: Posts sorted by date (newest first)
- ✅ **Error Handling**: Graceful handling of missing/corrupted files
- ✅ **Caching**: Optional caching for SSR/API routes
- ✅ **Filtering**: Filter by tags, date, keywords

### Basic Usage

```typescript
import { loadAllPosts, paginatePosts } from './lib/blog/loader';

// Load all posts
const posts = await loadAllPosts();

// Paginate
const page = paginatePosts(posts, 0, 10);
console.log(page.posts);      // First 10 posts
console.log(page.hasMore);    // true if more posts available
console.log(page.totalCount); // Total number of posts
```

### Get Single Post

```typescript
import { getPostBySlug } from './lib/blog/loader';

const post = getPostBySlug(posts, '2026-01-17');
```

### Filter by Tag

```typescript
import { getPostsByTag } from './lib/blog/loader';

const testPosts = getPostsByTag(posts, 'test');
```

### Next.js Integration

#### Blog List Page (App Router)

```typescript
// app/blog/page.tsx
import { loadAllPosts, paginatePosts } from '@/lib/blog/loader';

export default async function BlogPage() {
  const posts = await loadAllPosts();
  const paginated = paginatePosts(posts, 0, 10);

  return (
    <div>
      {paginated.posts.map((post) => (
        <article key={post.filename}>
          <h2>{post.metadata.title}</h2>
        </article>
      ))}
    </div>
  );
}
```

#### Single Post Page

```typescript
// app/blog/[slug]/page.tsx
import { loadAllPosts, getPostBySlug } from '@/lib/blog/loader';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

export async function generateStaticParams() {
  const posts = await loadAllPosts();
  return posts.map((post) => ({
    slug: post.filename.replace('.md', ''),
  }));
}

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const posts = await loadAllPosts();
  const post = getPostBySlug(posts, params.slug);

  if (!post) notFound();

  return (
    <article>
      <h1>{post.metadata.title}</h1>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
        {post.content}
      </ReactMarkdown>
    </article>
  );
}
```

### API Routes with Caching

```typescript
// app/api/posts/route.ts
import { loadAllPostsCached, paginatePosts } from '@/lib/blog/loader';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '0', 10);
  
  const posts = await loadAllPostsCached();
  const result = paginatePosts(posts, page, 10);
  
  return Response.json(result);
}
```

### Loader Type Definitions

```typescript
interface PaginatedPosts {
  posts: ParsedPost[];
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}
```

### Security Features

1. **Filename Validation**: Only `YYYY-MM-DD.md` format accepted
2. **Path Traversal Prevention**: Validates real paths
3. **Input Sanitization**: All inputs validated

```typescript
// Invalid formats return null
getPostBySlug(posts, '../../../etc/passwd'); // null

// Only valid dates work
getPostBySlug(posts, '2026-01-17'); // ✅ Works
```

### Testing

Run verification:
```bash
npx tsx lib/blog/verify-loader.ts
```

### Available Functions

- `loadAllPosts()` - Load all posts from filesystem
- `loadAllPostsCached()` - Load with caching (for SSR/API)
- `paginatePosts(posts, page, pageSize)` - Paginate posts
- `getPostBySlug(posts, slug)` - Get single post
- `getPostsByTag(posts, tag)` - Filter by tag
- `getAllTags(posts)` - Get all unique tags
- `getRecentPosts(posts, limit)` - Get recent posts
- `clearCache()` - Clear the cache

---

## License

Part of the workspace project.
