# Blog Components

Reusable, accessible components for displaying blog content with MUI Joy.

## Components

- **BlogCard** - Individual blog post preview card
- **BlogList** - Grid layout with infinite scroll and lazy loading

---

# BlogCard Component

A reusable, accessible card component for displaying blog post previews.

## Features

- ✅ **Responsive Design**: Works on mobile, tablet, and desktop
- ✅ **Accessibility**: Full keyboard navigation, ARIA labels, semantic HTML
- ✅ **MUI Joy Integration**: Built with Material-UI Joy components
- ✅ **Flexible Styling**: Supports color and variant props
- ✅ **Lazy Loading**: Cover images load lazily for better performance
- ✅ **Type Safety**: Full TypeScript support with strict types
- ✅ **Graceful Fallbacks**: Handles missing metadata (summary, image, tags, etc.)

## Usage

### Basic Example

```tsx
import { BlogCard } from './components/blog/BlogCard';
import type { ParsedPost } from './lib/blog/parser';

const post: ParsedPost = {
  filename: '2026-01-17.md',
  metadata: {
    title: 'My Blog Post',
    summary: 'A short summary of the post',
    tags: ['react', 'typescript'],
    cover_image: '/images/cover.png',
    author: 'John Doe',
  },
  content: '# Full markdown content...',
  rawMarkdown: '# Full markdown content...',
};

function MyComponent() {
  const handleClick = () => {
    console.log('Post clicked!');
    // Navigate to full post view
  };

  return (
    <BlogCard post={post} onClick={handleClick} />
  );
}
```

### With Custom Styling

```tsx
<BlogCard 
  post={post} 
  onClick={handleClick}
  color="primary"
  variant="outlined"
/>
```

### In a List

```tsx
function BlogList({ posts }: { posts: ParsedPost[] }) {
  const handlePostClick = (post: ParsedPost) => {
    router.push(`/blog/${post.filename.replace('.md', '')}`);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {posts.map((post) => (
        <BlogCard 
          key={post.filename}
          post={post}
          onClick={() => handlePostClick(post)}
        />
      ))}
    </div>
  );
}
```

## Props

### BlogCardProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `post` | `ParsedPost` | Yes | - | The parsed post data to display |
| `onClick` | `() => void` | Yes | - | Callback when card is clicked |
| `color` | `'primary' \| 'neutral' \| 'danger' \| 'success' \| 'warning'` | No | `'neutral'` | Card color variant |
| `variant` | `'plain' \| 'outlined' \| 'soft' \| 'solid'` | No | `'plain'` | Card style variant |

## Component Structure

```
BlogCard
├── CardOverflow (if cover_image exists)
│   └── AspectRatio (2:1)
│       └── img (lazy loaded)
└── CardContent
    ├── Typography (title, h3)
    ├── Typography (date, time element)
    ├── Typography (author, optional)
    ├── Typography (summary, optional)
    └── Box (tags container, optional)
        └── Chip[] (tags)
```

## Accessibility Features

- **Keyboard Navigation**: Fully navigable with Tab key
- **Enter/Space Key**: Activates the card
- **Focus Indicator**: Visible focus outline (2px solid primary)
- **ARIA Labels**: `aria-label` includes post title
- **Semantic HTML**: 
  - `<article>` role for card
  - `<time>` element with `dateTime` attribute for dates
  - `<h3>` for title hierarchy
- **Screen Reader Support**: All content is properly announced

## Display Logic

### Date Extraction Priority

1. **Filename pattern**: `YYYY-MM-DD.md` format
2. **Metadata.date**: Falls back to front matter date field
3. **Current date**: Last resort if neither above is available

### Optional Elements

The component gracefully handles missing metadata:

- **Cover Image**: Only shows if `metadata.cover_image` exists
- **Summary**: Only shows if `metadata.summary` exists
- **Author**: Only shows if `metadata.author` exists
- **Tags**: Only shows if `metadata.tags` has items

## Styling

The component follows Big-AGI card layout patterns:

- **Card spacing**: `mb: 3` (24px margin bottom)
- **Minimum height**: `32px`
- **Gap**: `1` (8px between elements)
- **Hover effect**: Elevated shadow on hover
- **Cover image ratio**: 2:1 aspect ratio
- **Typography**: MUI Joy levels (`title-lg`, `body-sm`)

### Customization

You can customize via MUI Joy theme or by passing `sx` props:

```tsx
// Custom styles via theme
// Or wrap in a styled component
```

## Performance

- **Lazy Loading**: Cover images use `loading="lazy"` attribute
- **Minimal Re-renders**: Component uses React best practices
- **Type Safety**: Full TypeScript checking prevents runtime errors

## Security

- **Sanitized Content**: All content comes from the parser which sanitizes markdown
- **No Dangerous HTML**: Uses React's safe rendering
- **XSS Protection**: rehype-sanitize handles markdown sanitization

## Testing

See `BlogCard.example.tsx` for usage examples and test scenarios.

## Related Components

- `BlogList.tsx` - List container with lazy loading (Task 08)
- `PostView.tsx` - Full post view component (Task 09)

---

# BlogList Component

A component that displays blog cards in a responsive grid with lazy loading and infinite scroll.

## Features

- ✅ **Infinite Scroll**: Uses Intersection Observer for performant scroll detection
- ✅ **Lazy Loading**: Progressively loads posts in batches of 10
- ✅ **Responsive Grid**: 1/2/3 columns based on screen size (mobile/tablet/desktop)
- ✅ **Loading States**: Initial loading, loading more, error, empty states
- ✅ **Accessibility**: ARIA live regions, focus management, screen reader announcements
- ✅ **Flexible Data**: Works with SSG (static) or CSR (client-side API) data
- ✅ **Error Handling**: Graceful error messages with retry functionality
- ✅ **No Duplicates**: Prevents duplicate posts from being loaded
- ✅ **Type Safety**: Full TypeScript support

## Usage

### Static/SSG Mode (Pre-loaded Data)

```tsx
import { BlogList } from './components/blog/BlogList';
import type { ParsedPost } from './lib/blog/parser';

function BlogPage({ allPosts }: { allPosts: ParsedPost[] }) {
  const initialPosts = allPosts.slice(0, 10);
  
  const handlePostClick = (post: ParsedPost) => {
    router.push(`/blog/${post.filename.replace('.md', '')}`);
  };

  return (
    <BlogList
      initialPosts={initialPosts}
      allPosts={allPosts}
      onPostClick={handlePostClick}
    />
  );
}
```

### Client-Side Mode (API Fetching)

```tsx
function BlogPage({ initialPosts }: { initialPosts: ParsedPost[] }) {
  const handlePostClick = (post: ParsedPost) => {
    router.push(`/blog/${post.filename.replace('.md', '')}`);
  };

  return (
    <BlogList
      initialPosts={initialPosts}
      // No allPosts - will fetch from /api/posts?page=N&pageSize=10
      onPostClick={handlePostClick}
    />
  );
}

// API Route: /api/posts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');
  
  const allPosts = await loadAllPosts(); // Your data source
  const start = page * pageSize;
  const posts = allPosts.slice(start, start + pageSize);
  
  return Response.json({
    posts,
    hasMore: start + posts.length < allPosts.length,
  });
}
```

### Custom Page Size

```tsx
<BlogList
  initialPosts={posts.slice(0, 5)}
  allPosts={posts}
  onPostClick={handlePostClick}
  pageSize={5} // Load 5 at a time instead of 10
/>
```

## Props

### BlogListProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `initialPosts` | `ParsedPost[]` | Yes | - | Initial posts to display (first page) |
| `allPosts` | `ParsedPost[]` | No | - | All posts for SSG mode (client-side pagination) |
| `onPostClick` | `(post: ParsedPost) => void` | Yes | - | Callback when a post is clicked |
| `pageSize` | `number` | No | `10` | Number of posts to load per page |

## Behavior

### Data Loading Modes

1. **SSG/Static Mode** (when `allPosts` is provided):
   - All posts pre-loaded at build time
   - Pagination happens client-side by slicing array
   - No network requests
   - Best for blogs with < 500 posts

2. **CSR/API Mode** (when `allPosts` is not provided):
   - Posts fetched from API endpoint as needed
   - Expects `/api/posts?page=N&pageSize=M` endpoint
   - Network requests on scroll
   - Best for large blogs or dynamic content

### Infinite Scroll

- Uses Intersection Observer API for performance
- Triggers 100px before reaching the bottom
- Automatically loads next batch when visible
- Prevents multiple simultaneous loads
- Disconnects observer when no more posts

### Edge Cases

The component handles all edge cases gracefully:

- **0 posts**: Shows "No blog posts yet" empty state
- **1-5 posts** (less than pageSize): No loading indicator shown
- **Exactly 10 posts**: Shows "No more posts" after initial load
- **Network errors**: Shows error message with retry button
- **Slow connections**: Shows loading spinner
- **Duplicate posts**: Filters by filename to prevent duplicates

## Component Structure

```
BlogList
├── Live Region (screen reader announcements)
├── Grid Container (responsive columns)
│   └── BlogCard[] (mapped posts)
├── Load More Trigger (intersection observer sentinel)
│   ├── Loading Spinner (when loading)
│   └── "Scroll for more" text (when idle)
├── "No more posts" (when hasMore = false)
└── Error Message + Retry Button (on error)
```

## Accessibility Features

- **ARIA Live Regions**: Announces loading states to screen readers
- **Focus Management**: Maintains focus position when new posts load
- **Keyboard Navigation**: All interactive elements keyboard accessible
- **Loading Announcements**: "Loading more posts" announced
- **Error Alerts**: Error messages use `role="alert"` with `aria-live="assertive"`
- **Semantic HTML**: Proper heading hierarchy maintained

## Grid Layout

Responsive breakpoints:

- **Mobile** (`xs`): 1 column
- **Tablet** (`sm`): 2 columns
- **Desktop** (`lg`): 3 columns

Gap between cards: `24px` (MUI Joy spacing `3`)

## Loading States

1. **Initial Load**: Shows first 10 posts immediately
2. **Loading More**: 
   - Spinner + "Loading more posts..." text
   - Announced to screen readers
3. **Error**: 
   - Red error message
   - Retry button
   - Announced to screen readers
4. **Empty**: 
   - "No blog posts yet" message
   - Centered layout
5. **No More**: 
   - "No more posts" message
   - Border separator

## Performance Optimizations

- **Intersection Observer**: More efficient than scroll listeners
- **Root Margin**: 100px pre-loading before reaching bottom
- **Lazy Images**: BlogCard handles lazy image loading
- **Deduplication**: Prevents duplicate posts by tracking filenames
- **Conditional Rendering**: Only renders necessary UI elements

## Error Handling

Errors are caught and displayed with:
- User-friendly error message
- Retry button to attempt reload
- Console error logging for debugging
- ARIA alert for screen readers

## API Contract

When using client-side mode, your API endpoint should return:

```typescript
{
  posts: ParsedPost[];      // Array of posts for this page
  hasMore: boolean;         // Whether more posts exist
  total?: number;           // Optional: total count
  page?: number;            // Optional: current page
  pageSize?: number;        // Optional: page size
}
```

Example API response:
```json
{
  "posts": [...],
  "hasMore": true,
  "total": 47,
  "page": 1,
  "pageSize": 10
}
```

## Examples

See `BlogList.example.tsx` for comprehensive examples including:
- Static/SSG mode
- Client-side API mode
- Empty state
- Few posts (< pageSize)
- Exactly one page
- Custom page size
- Example API handler

## Styling

Uses MUI Joy components for consistent styling:
- `Box` for layout containers
- `Typography` for text
- `CircularProgress` for loading spinner
- `Stack` for flexbox layouts

The grid is fully responsive and follows MUI Joy's breakpoint system.

## Testing Scenarios

Test these scenarios:
1. ✅ Load with 0 posts (empty state)
2. ✅ Load with 5 posts (less than page size)
3. ✅ Load with exactly 10 posts (one page)
4. ✅ Load with 25 posts (multiple pages)
5. ✅ Scroll to trigger infinite scroll
6. ✅ Network error during load
7. ✅ Click retry button
8. ✅ Keyboard navigation
9. ✅ Screen reader announcements
10. ✅ Mobile/tablet/desktop responsiveness

## Related Components

- `BlogCard.tsx` - Individual blog post card component (Task 07)
- `PostView.tsx` - Full post view component (Task 09)

## Technical Details

- **Framework**: React 18.3.0
- **UI Library**: MUI Joy 5.0.0-beta.52
- **TypeScript**: Strict mode enabled
- **Styling**: Emotion (CSS-in-JS via MUI Joy)

## References

- [MUI Joy Card Documentation](https://mui.com/joy-ui/react-card/)
- [Big-AGI News Layout Pattern](https://github.com/enricoros/big-AGI)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

# PostView Component

Full post view component for displaying complete blog post content with markdown rendering.

## Features

- ✅ **Full Markdown Rendering**: Uses react-markdown with GFM support
- ✅ **XSS Protection**: Content sanitized via rehype-sanitize
- ✅ **Responsive Design**: Optimal reading experience on all devices
- ✅ **Keyboard Navigation**: Escape key to close
- ✅ **Accessibility**: WCAG 2.1 Level AA compliant
- ✅ **Cover Images**: Responsive aspect ratio (16:9)
- ✅ **Post Metadata**: Displays title, date, author, tags, summary
- ✅ **Typography**: Optimized for reading (900px max width, 1.75 line height)
- ✅ **Comprehensive Styling**: All markdown elements styled properly
- ✅ **MUI Joy Integration**: Follows Big-AGI patterns

## Usage

### Basic Example

```tsx
import { PostView } from './components/blog';
import type { ParsedPost } from './lib/blog/parser';

function BlogPostPage({ post }: { post: ParsedPost }) {
  const router = useRouter();
  
  return (
    <PostView
      post={post}
      onClose={() => router.push('/blog')}
    />
  );
}
```

### With State Management

```tsx
import { useState } from 'react';
import { BlogList, PostView } from './components/blog';

function BlogPage({ posts }: { posts: ParsedPost[] }) {
  const [selectedPost, setSelectedPost] = useState<ParsedPost | null>(null);

  return (
    <>
      {selectedPost ? (
        <PostView
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      ) : (
        <BlogList
          initialPosts={posts.slice(0, 10)}
          allPosts={posts}
          onPostClick={setSelectedPost}
        />
      )}
    </>
  );
}
```

## Props

### PostViewProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `post` | `ParsedPost` | Yes | The parsed post data to display |
| `onClose` | `() => void` | Yes | Callback when user wants to close/go back |

## Component Structure

```
PostView (article)
├── Back Button
├── Cover Image (optional, Card with AspectRatio 16:9)
├── Header (bordered)
│   ├── Title (h1)
│   ├── Metadata Row
│   │   ├── Date (time element)
│   │   └── Author (optional)
│   ├── Tags (optional, Chips)
│   └── Summary (optional, italic)
├── Markdown Content (react-markdown)
│   └── [All markdown elements styled]
└── Footer (bordered)
    ├── Back to top button
    └── Back to posts button
```

## Accessibility Features

- **Semantic HTML**: 
  - `<article>` for main content
  - `<header>` for post metadata
  - `<time>` with `dateTime` attribute
  - Proper heading hierarchy (h1 → h2 → h3)
- **Keyboard Navigation**: 
  - Escape key closes view
  - All buttons keyboard accessible
  - Focus visible states on links/buttons
- **ARIA Labels**: 
  - "Back to blog list" on back button
  - Proper alt text on images
- **Screen Reader Support**: All content properly announced
- **Color Contrast**: WCAG AA compliant contrast ratios

## Markdown Rendering

### Supported Elements

All standard markdown elements are supported and styled:

- **Headings**: h1-h6 with proper sizing and spacing
- **Paragraphs**: Optimal line height (1.75) and spacing
- **Lists**: Ordered and unordered with proper indentation
- **Blockquotes**: Visual distinction with left border and background
- **Code**: 
  - Inline code with background and monospace font
  - Code blocks with syntax highlighting support
- **Links**: Styled with underline and hover states
- **Images**: Responsive sizing with rounded corners
- **Tables**: Proper formatting with borders and padding
- **Horizontal Rules**: Subtle dividers
- **Bold/Italic**: Standard formatting
- **Strikethrough**: GFM support via remark-gfm

### Plugins

- **remark-gfm**: GitHub Flavored Markdown (tables, strikethrough, task lists)
- **rehype-sanitize**: XSS protection (removes dangerous HTML/scripts)

## Display Logic

### Date Extraction Priority

1. **Filename pattern**: `YYYY-MM-DD.md` format (e.g., "2025-01-17.md")
2. **Metadata.date**: Falls back to front matter date field
3. **Current date**: Last resort if neither above is available

### Optional Elements

The component gracefully handles missing metadata:

- **Cover Image**: Only shows if `metadata.cover_image` exists
- **Summary**: Only shows if `metadata.summary` exists (displays as italic lead-in)
- **Author**: Only shows if `metadata.author` exists (shows with date)
- **Tags**: Only shows if `metadata.tags` has items

## Styling

### Typography

Optimized for reading with:
- **Max width**: 900px for optimal line length
- **Font size**: 1.125rem (18px) base
- **Line height**: 1.75 for comfortable reading
- **Heading scale**: Proper hierarchy with responsive sizes
- **Monospace code**: Consolas, Monaco, Courier New

### Prose Styling

Comprehensive styling for all markdown elements:

```css
h1: 2.25rem, bold, mt: 4, mb: 2
h2: 1.875rem, semibold, mt: 3.5, mb: 1.5
h3: 1.5rem, semibold, mt: 3, mb: 1
p: mb: 2, line-height: 1.75
ul/ol: ml: 3, mb: 2
blockquote: border-left 4px, pl: 2, italic, background
code: background, px: 0.75, py: 0.25, rounded
pre: background, p: 2, rounded, border
a: primary color, underline, focus states
img: max-width 100%, rounded, my: 2
```

### Responsive Design

- **Mobile** (xs): Smaller text, reduced padding
- **Tablet** (sm): Medium text and padding
- **Desktop** (md): Full size text, optimal padding
- **Max width**: 900px centered for readability

## Features

### Keyboard Navigation

- **Escape Key**: Closes the post view and returns to list
- **Tab Navigation**: All interactive elements accessible
- **Focus Indicators**: Visible outlines on focused elements

### Smooth Scrolling

- **On Post Change**: Automatically scrolls to top when post changes
- **Back to Top Button**: Smooth scroll to top in footer
- **Behavior**: `smooth` for better UX

### Navigation

- **Back Button**: Returns to post list (header)
- **Back to Posts Button**: Returns to list (footer)
- **Back to Top Button**: Scrolls to page top (footer)

## Security

### XSS Protection

- **rehype-sanitize**: Removes dangerous HTML/JavaScript
- **Safe Attributes**: Only allows safe HTML attributes
- **Script Removal**: Strips all `<script>` tags
- **Event Handler Removal**: Strips `onclick`, `onerror`, etc.

### Content Safety

All content is sanitized before rendering:
1. Parser receives raw markdown
2. react-markdown converts to React elements
3. rehype-sanitize filters dangerous content
4. Safe HTML rendered to page

## Performance

- **Lazy Loading**: Cover images eager loaded (above fold)
- **Minimal Re-renders**: useEffect dependencies optimized
- **Event Cleanup**: Keyboard listeners properly removed
- **Smooth Scroll**: GPU-accelerated scrolling

## Examples

See `PostView.example.tsx` for comprehensive examples including:
- Full post with all metadata
- Post without cover image
- Post without author/tags
- Integration with BlogList
- Navigation handling

## Related Components

- `BlogCard.tsx` - Preview card component (Task 07)
- `BlogList.tsx` - List with lazy loading (Task 08)

## Technical Details

- **Framework**: React 18.3.0
- **UI Library**: MUI Joy 5.0.0-beta.52
- **Markdown**: react-markdown 10.1.0
- **Plugins**: remark-gfm 4.0.1, rehype-sanitize 6.0.0
- **TypeScript**: Strict mode enabled
- **Styling**: Emotion (CSS-in-JS via MUI Joy)

## References

- [react-markdown Documentation](https://github.com/remarkjs/react-markdown)
- [remark-gfm Plugin](https://github.com/remarkjs/remark-gfm)
- [rehype-sanitize Plugin](https://github.com/rehypejs/rehype-sanitize)
- [MUI Joy Components](https://mui.com/joy-ui/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
