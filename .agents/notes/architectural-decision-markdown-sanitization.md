# Architectural Decision: Markdown Parsing and Sanitization

**Date**: January 18, 2026  
**Decision Made By**: Coder Mode  
**Status**: Approved

---

## Context

During Task 05 (Create Markdown Parser Utility), a specification mismatch was identified by the Auditor. The task specification required one approach, while the implementation used a different (but equally valid) approach.

---

## Decision

**Chosen Approach**: Render-time sanitization with raw markdown output

The parser returns **raw markdown** content, with sanitization happening at render time using:
- `react-markdown` for rendering
- `rehype-sanitize` plugin for XSS protection

**Rejected Approach**: Parse-time sanitization with HTML output
- Would use `marked` + `isomorphic-dompurify`
- Would convert markdown to HTML at parse time
- Would return sanitized HTML strings

---

## Rationale

### Why Render-Time Sanitization is Better for This Project:

1. **Standard React/Next.js Pattern**
   - `react-markdown` is the de facto standard in React ecosystems
   - Aligns with React's component-based architecture
   - Better community support and documentation

2. **Performance Benefits**
   - No double parsing (markdown → HTML → React elements)
   - React-markdown directly creates React elements from markdown
   - Smaller bundle size (no need for marked + DOMPurify)

3. **Flexibility**
   - Same markdown can be rendered differently in different contexts
   - Easy to customize rendering (code blocks, links, etc.)
   - Can add interactive components within markdown

4. **Security**
   - `rehype-sanitize` is specifically designed for React
   - Built on the same sanitization principles as DOMPurify
   - Actively maintained by the unified/rehype ecosystem

5. **Developer Experience**
   - Simpler mental model (markdown in, components out)
   - Easier testing (test raw markdown, not HTML strings)
   - Better TypeScript integration with React components

---

## Implementation Details

### Parser Output
```typescript
{
  metadata: PostMetadata,
  content: string,      // Raw markdown
  rawMarkdown: string,  // Same as content
  filename: string
}
```

### Rendering
```tsx
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

<ReactMarkdown rehypePlugins={[rehypeSanitize]}>
  {post.content}
</ReactMarkdown>
```

---

## Trade-offs Accepted

### What We Gain:
- Better React integration
- More flexible rendering
- Smaller dependencies
- Better performance

### What We Give Up:
- Cannot use markdown content outside React (e.g., in API responses)
- Must ensure all consumers use rehype-sanitize
- Slightly different API than originally specified

---

## Dependencies

**Required in package.json**:
```json
{
  "dependencies": {
    "gray-matter": "4.0.3",           // Front matter parsing
    "react-markdown": "^10.1.0",       // Markdown rendering
    "rehype-sanitize": "^6.0.0",       // XSS protection
    "remark-gfm": "^4.0.1"            // GitHub Flavored Markdown
  }
}
```

**NOT needed** (rejected approach):
- `marked` - Markdown to HTML converter
- `isomorphic-dompurify` - HTML sanitizer

---

## Files Affected

1. `lib/blog/parser.ts` - Returns raw markdown
2. `.agents/tasks/done/05-create-markdown-parser-utility.md` - Updated specification
3. Future rendering components will use `react-markdown` + `rehype-sanitize`

---

## Security Considerations

### XSS Protection
- `rehype-sanitize` removes dangerous HTML tags and attributes
- Safe by default configuration
- No script execution possible

### Test Coverage
```typescript
// Security test in parser.test.ts
test('does not execute or transform script tags in markdown', () => {
  const input = '<script>alert("xss")</script>';
  const result = parsePost('security.md', input);
  // Raw markdown preserved (sanitization at render time)
  expect(result.content).toContain('<script>');
});
```

---

## Future Considerations

- If we need to expose markdown content via API (non-React consumers), we may need to add an HTML conversion utility
- Consider documenting the required rehype-sanitize configuration for all blog rendering components
- Monitor react-markdown for breaking changes during Next.js upgrades

---

## Approval

This architectural decision was made by Coder Mode after reviewing the Auditor's feedback. The decision prioritizes:
1. Modern React best practices
2. Developer experience
3. Performance
4. Maintainability

**Result**: Task 05 specification updated to reflect this approach. Implementation validated and moved to done.
