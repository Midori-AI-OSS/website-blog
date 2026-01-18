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

## Technical Details

- **Framework**: React 18.3.0
- **UI Library**: MUI Joy 5.0.0-beta.52
- **TypeScript**: Strict mode enabled
- **Styling**: Emotion (CSS-in-JS via MUI Joy)

## References

- [MUI Joy Card Documentation](https://mui.com/joy-ui/react-card/)
- [Big-AGI News Layout Pattern](https://github.com/enricoros/big-AGI)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
