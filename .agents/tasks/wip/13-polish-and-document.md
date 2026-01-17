# Task: Polish and Document

## Objective
Final polish, optimization, and documentation of the blog system.

## Steps

### 1. Performance Optimization
- [ ] Check bundle size: `bun run build && du -sh .next` (or equivalent)
- [ ] Target: < 500KB for blog functionality
- [ ] Optimize images (lazy load, responsive, WebP format)
- [ ] Memoize expensive operations (parsing, sorting)
- [ ] Review re-render patterns (use React DevTools Profiler)
- [ ] Code splitting (dynamic imports if needed)

### 2. Error Handling
- [ ] Handle empty blog directory (show friendly message)
- [ ] Handle malformed markdown (skip or show error gracefully)
- [ ] Handle missing files (404 page for missing posts)
- [ ] Handle API failures (if client-side loading)
- [ ] Display user-friendly error messages (no stack traces)
- [ ] Log errors for debugging (console.error)

### 3. Accessibility
- [ ] Add ARIA labels (buttons, links, loading states)
- [ ] Ensure keyboard navigation (Tab, Enter, Escape keys)
- [ ] Check color contrast (4.5:1 minimum for text)
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Focus management (when navigating, focus moves correctly)
- [ ] Alt text for images
- [ ] Semantic HTML (article, nav, header, time, etc.)

### 4. Documentation
Create `blog/README.md`:
```markdown
# Blog System

## Adding New Posts

1. Create a file in `blog/posts/` with format: `YYYY-MM-DD.md`
2. Add optional front matter (---delimited YAML):
   ```yaml
   ---
   title: Your Post Title
   summary: Brief description (optional)
   tags: [tag1, tag2]
   cover_image: /path/to/image.png (optional)
   ---
   ```
3. Write your content in Markdown below the front matter
4. Commit and push (rebuild/redeploy if SSG)

## Filename Format

- **Required:** `YYYY-MM-DD.md` (e.g., `2026-01-17.md`)
- Date determines sort order (newest first)
- Used as URL slug: `/blog/2026-01-17`

## Front Matter Options

All fields are optional:

| Field | Type | Description |
|-------|------|-------------|
| title | string | Post title (defaults to date if missing) |
| summary | string | Brief description for card preview |
| tags | array | List of tags for categorization |
| cover_image | string | Path to cover image |

## Cover Images

- Place images in `public/assets/blog/`
- Reference as: `/assets/blog/image.png`
- Recommended size: 1200x630px
- Format: WebP or JPEG

## Example Post

See `blog/posts/2026-01-17.md` for a complete example.

## Technical Details

- Parser: [lib|utils]/blog/parser.ts
- Loader: [lib|utils]/blog/loader.ts
- Components: components/blog/
- Routes: [app|pages]/blog/
```

### 5. Code Comments
- [ ] Add JSDoc comments to public functions:
  ```typescript
  /**
   * Parses a blog post markdown file with front matter.
   * @param filename - The filename (YYYY-MM-DD.md format)
   * @param fileContent - Raw markdown content
   * @returns Parsed post with metadata and sanitized HTML
   */
  export function parsePost(filename: string, fileContent: string): ParsedPost
  ```
- [ ] Comment complex logic (regex, algorithms, workarounds)
- [ ] Document component props (JSDoc or TypeScript)
- [ ] Add inline comments for non-obvious code

### 6. Final Review
- [ ] Code review (self or peer)
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Verify all acceptance criteria from task 00
- [ ] Check for security issues (XSS, path traversal)
- [ ] Verify performance benchmarks met
- [ ] Ensure all dependencies are documented

## Success Criteria
- [ ] Performance is acceptable (bundle size, load times)
- [ ] Errors handled gracefully (no crashes, user-friendly messages)
- [ ] Accessible to all users (WCAG 2.1 AA or target from technical decisions)
- [ ] Well documented (`blog/README.md` created)
- [ ] Code is maintainable (comments, clear structure)
- [ ] All features working (verified by task 12)
- [ ] Security verified (XSS prevention, path traversal prevention)
- [ ] All acceptance criteria from task 00 met

## Deliverables
1. `blog/README.md` - User documentation
2. Code comments and JSDoc
3. Verified acceptance criteria
4. Working blog system
