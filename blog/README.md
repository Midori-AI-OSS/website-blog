# Blog System Documentation

## Overview

This is a fully-featured, static-generated blog system built with Next.js 15, TypeScript, and MUI Joy. The blog posts are written in Markdown with optional front matter metadata.

## Adding New Posts

1. Create a file in `blog/posts/` with format: `YYYY-MM-DD.md`
2. Add optional front matter (YAML format, delimited by `---`):
   ```yaml
   ---
   title: Your Post Title
   summary: Brief description (optional)
   tags: [tag1, tag2]
   cover_image: /assets/blog/image.png
   author: Your Name (optional)
   date: 2026-01-17 (optional, overrides filename date)
   ---
   ```
3. Write your content in Markdown below the front matter
4. Commit and push (the site will rebuild automatically if deployed with CI/CD)

## Filename Format

- **Required:** `YYYY-MM-DD.md` (e.g., `2026-01-17.md`)
- Date determines sort order (newest first)
- Used as URL slug: `/blog/2026-01-17`
- Must match pattern exactly for security reasons

## Front Matter Options

All fields are optional:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| title | string | Post title (defaults to date if missing) | `"My First Post"` |
| summary | string | Brief description for card preview | `"An introduction to..."` |
| tags | array | List of tags for categorization | `[javascript, tutorial]` |
| cover_image | string | Path to cover image | `/assets/blog/hero.png` |
| author | string | Author name | `"Jane Doe"` |
| date | string | Override date from filename | `"2026-01-17"` |

## Cover Images

- Place images in `public/assets/blog/`
- Reference as: `/assets/blog/image.png`
- Recommended size: 1200x630px (16:9 aspect ratio)
- Supported formats: WebP, JPEG, PNG
- Images are lazy-loaded for performance
- Alt text is automatically set to post title

## Markdown Features

The blog supports GitHub-flavored Markdown (GFM) with these features:

- **Headings** (`# H1` through `###### H6`)
- **Bold** (`**text**`) and *italic* (`*text*`)
- **Links** (`[text](url)`)
- **Images** (`![alt](url)`)
- **Lists** (ordered and unordered)
- **Code blocks** with syntax highlighting
- **Blockquotes** (`> quote`)
- **Tables** (GFM tables)
- **Task lists** (`- [ ] task`)
- **Strikethrough** (`~~text~~`)
- **Horizontal rules** (`---`)

### Security

All content is sanitized using `rehype-sanitize` to prevent XSS attacks. HTML tags in markdown will be sanitized or stripped.

## Example Post

See `blog/posts/2026-01-17.md` for a complete example with all features.

Example:

```markdown
---
title: Getting Started with Next.js
summary: Learn the basics of building web apps with Next.js 15
tags: [nextjs, tutorial, react]
cover_image: /assets/blog/nextjs-hero.png
author: John Developer
---

# Welcome to My Blog

This is my first post about Next.js. Here's what we'll cover:

1. Installation
2. Creating pages
3. Routing

## Installation

First, install Next.js:

\`\`\`bash
npx create-next-app@latest
\`\`\`

> **Note:** Make sure you have Node.js 18+ installed.

## Conclusion

That's it! Happy coding!
```

## Project Structure

```
blog/
├── posts/              # Markdown files (YYYY-MM-DD.md)
│   ├── 2026-01-17.md
│   └── 2026-01-18.md
└── README.md          # This file

app/
├── blog/
│   ├── page.tsx       # Blog list page (/blog)
│   ├── BlogPageClient.tsx
│   └── [slug]/
│       ├── page.tsx   # Individual post page (/blog/2026-01-17)
│       └── PostPageClient.tsx

components/blog/
├── BlogCard.tsx       # Post preview card
├── BlogList.tsx       # Grid of posts with infinite scroll
├── PostView.tsx       # Full post view with markdown rendering
└── index.ts           # Exports

lib/blog/
├── parser.ts          # Markdown parsing with front matter
├── loader.ts          # File loading, sorting, pagination
└── *.test.ts          # Unit tests
```

## Technical Details

### Parser (`lib/blog/parser.ts`)

Parses markdown files with front matter using `gray-matter`:

```typescript
import { parsePost } from '@/lib/blog/parser';

const post = parsePost('2026-01-17.md', fileContent);
// Returns: { metadata, content, rawMarkdown, filename }
```

**Features:**
- Validates metadata structure
- Sanitizes metadata values
- Provides safe defaults for missing fields
- Error handling (returns safe defaults instead of crashing)

### Loader (`lib/blog/loader.ts`)

Loads posts from filesystem with security and performance features:

```typescript
import { loadAllPosts, paginatePosts, getPostBySlug } from '@/lib/blog/loader';

// Load all posts
const posts = await loadAllPosts();

// Paginate
const page = paginatePosts(posts, 0, 10);

// Get single post
const post = getPostBySlug(posts, '2026-01-17');
```

**Features:**
- Filename validation (prevents path traversal)
- Real path verification
- Sorting by date (newest first)
- Pagination support
- Error handling (graceful failures)
- Optional caching for SSR

### Components

**BlogCard** - Displays post preview with:
- Cover image (optional, lazy-loaded)
- Title and date
- Summary (if provided)
- Tags
- Keyboard navigation (Enter key)
- ARIA labels for accessibility

**BlogList** - Grid of blog cards with:
- Responsive layout (1/2/3 columns)
- Infinite scroll with Intersection Observer
- Loading states
- Empty state handling
- Error handling with retry
- ARIA live regions for screen readers

**PostView** - Full post display with:
- Cover image header
- Metadata (title, date, author, tags)
- Markdown rendering with sanitization
- Back navigation
- Keyboard shortcuts (Escape to close)
- Responsive typography
- Table of contents styling

## Building and Deployment

```bash
# Development server
npm run dev

# Production build (generates static pages)
npm run build

# Start production server
npm start
```

The blog uses **Static Site Generation (SSG)**:
- All posts are generated at build time
- Individual post pages are pre-rendered
- No server-side logic required
- Excellent performance and SEO

## Performance

- Bundle size: ~186KB for individual posts, ~140KB for list
- All images lazy-loaded
- Responsive images with proper aspect ratios
- Code splitting for optimal loading
- Memoized operations for fast rendering

## Accessibility

- Semantic HTML5 elements (`article`, `nav`, `time`, etc.)
- ARIA labels on interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Focus management
- Screen reader announcements (ARIA live regions)
- Color contrast: meets WCAG 2.1 AA standards
- Alt text on images

## Security

### XSS Prevention
- All markdown content sanitized with `rehype-sanitize`
- No dangerouslySetInnerHTML used
- React's built-in XSS protection

### Path Traversal Prevention
- Strict filename validation (`YYYY-MM-DD.md` pattern only)
- Real path verification before file access
- No user-supplied paths accepted

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test parser.test.ts
```

Tests cover:
- Parser: front matter parsing, validation, error handling
- Loader: file loading, sorting, pagination, security
- Components: rendering, accessibility, user interactions

## Troubleshooting

### No posts showing up
- Check that files are in `blog/posts/` directory
- Verify filename format is exactly `YYYY-MM-DD.md`
- Check console for error messages
- Ensure files are valid markdown with optional front matter

### Images not loading
- Verify images are in `public/` directory
- Check path starts with `/` (e.g., `/assets/blog/image.png`)
- Confirm image files exist and are accessible
- Check browser console for 404 errors

### Build fails
- Run `npm run build` to see detailed errors
- Check for syntax errors in markdown files
- Verify all dependencies are installed: `npm install`
- Check Next.js and React versions are compatible

### Styling issues
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run build`
- Check MUI Joy theme configuration
- Verify CSS-in-JS is working correctly

## Extending the System

### Adding Categories
Modify `parser.ts` to add a `category` field to `PostMetadata`, then update loader to include `getPostsByCategory()`.

### Adding Search
Create a search component that filters posts by title, summary, tags, or content using `allPosts.filter()`.

### Adding RSS Feed
Create an API route at `app/api/rss/route.ts` that generates XML from `loadAllPosts()`.

### Adding Related Posts
Implement tag-based similarity in loader using `getPostsByTag()` to find posts with overlapping tags.

## License

This blog system is part of the larger project. Refer to the root LICENSE file.

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing procedures including:
- Keyboard navigation testing
- Accessibility audits (WCAG 2.1 AA compliance)
- Browser and device testing
- Performance testing
- Unit test execution

## Support

For issues or questions:
1. Check this README and [TESTING.md](./TESTING.md)
2. Review code comments in `lib/blog/` and `components/blog/`
3. Check console for error messages
4. Review test files for usage examples
