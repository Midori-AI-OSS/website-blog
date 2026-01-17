# Task: Create Markdown Parser Utility

## Objective
Build a utility to parse blog posts with optional front matter metadata.

## Prerequisites
- Task 04 completed (dependencies installed)
- Know front matter delimiter from technical decisions (`---` or `+++`)

## Requirements
- Parse front matter with delimiter from technical decisions (`---` standard or `+++` custom)
- Extract: title, summary, tags, cover_image
- Handle posts without metadata (use defaults)
- Parse markdown content to HTML
- **SECURITY:** Sanitize HTML output to prevent XSS attacks
- **ERROR HANDLING:** Gracefully handle malformed front matter
- Return structured post data

## Steps
1. Create parser file in utilities directory (from technical decisions):
   - `lib/blog/parser.ts` OR `utils/blog/parser.ts`

2. Implement front matter parsing:
   ```typescript
   import matter from 'gray-matter';
   import { marked } from 'marked';
   import DOMPurify from 'isomorphic-dompurify';
   
   // Configure gray-matter delimiter (if using +++)
   // const customDelimiter = { delimiters: '+++' };
   
   interface PostMetadata {
     title: string;
     summary?: string;
     tags?: string[];
     cover_image?: string;
   }
   
   interface ParsedPost {
     metadata: PostMetadata;
     content: string;        // Sanitized HTML
     rawMarkdown: string;
     filename: string;
   }
   ```

3. Implement parsing function with error handling:
   ```typescript
   export function parsePost(filename: string, fileContent: string): ParsedPost {
     try {
       // Parse front matter
       const { data, content } = matter(fileContent);
       
       // Extract metadata with defaults
       const metadata: PostMetadata = {
         title: data.title || extractTitleFromFilename(filename),
         summary: data.summary,
         tags: Array.isArray(data.tags) ? data.tags : [],
         cover_image: data.cover_image,
       };
       
       // Parse markdown to HTML
       const rawHTML = marked(content);
       
       // SECURITY: Sanitize HTML to prevent XSS
       const sanitizedHTML = DOMPurify.sanitize(rawHTML);
       
       return {
         metadata,
         content: sanitizedHTML,
         rawMarkdown: content,
         filename,
       };
     } catch (error) {
       console.error(`Error parsing ${filename}:`, error);
       // Return safe default
       return {
         metadata: {
           title: extractTitleFromFilename(filename),
         },
         content: '<p>Error loading post content</p>',
         rawMarkdown: '',
         filename,
       };
     }
   }
   
   function extractTitleFromFilename(filename: string): string {
     // Extract date from YYYY-MM-DD.md format
     const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
     return match ? `Post from ${match[1]}` : 'Untitled Post';
   }
   ```

4. Add input validation:
   ```typescript
   function validateMetadata(data: any): boolean {
     // Validate metadata fields
     if (data.tags && !Array.isArray(data.tags)) return false;
     if (data.cover_image && typeof data.cover_image !== 'string') return false;
     return true;
   }
   ```

5. Add unit tests (recommended):
   ```typescript
   // In parser.test.ts
   import { parsePost } from './parser';
   
   test('parses post with full metadata', () => {
     const input = `---
   title: Test Post
   summary: Test summary
   ---
   # Content`;
     const result = parsePost('2026-01-17.md', input);
     expect(result.metadata.title).toBe('Test Post');
   });
   
   test('handles post without metadata', () => {
     const input = '# Just Content';
     const result = parsePost('2026-01-17.md', input);
     expect(result.metadata.title).toContain('2026-01-17');
   });
   
   test('sanitizes malicious HTML', () => {
     const input = '<script>alert("xss")</script>';
     const result = parsePost('test.md', input);
     expect(result.content).not.toContain('<script>');
   });
   ```

## Success Criteria
- [ ] Parser file created in correct location (lib/ or utils/)
- [ ] Handles front matter with chosen delimiter correctly
- [ ] Works with posts without metadata
- [ ] Returns structured post data with correct TypeScript types
- [ ] Default title from filename date works
- [ ] **SECURITY:** HTML output is sanitized (no XSS risk)
- [ ] **ERROR HANDLING:** Malformed front matter doesn't crash parser
- [ ] **ERROR HANDLING:** Invalid metadata values handled gracefully
- [ ] Validates front matter structure
- [ ] Unit tests pass (if implemented)
- [ ] Can be imported successfully: `import { parsePost } from '[lib|utils]/blog/parser'`

## Example
Input file `2026-01-17.md`:
```markdown
---
title: Hello World
summary: My first post
tags: [welcome, intro]
---

# Content here
```

Output:
```javascript
{
  metadata: {
    title: "Hello World",
    summary: "My first post",
    tags: ["welcome", "intro"]
  },
  content: "<h1>Content here</h1>",  // Sanitized HTML
  rawMarkdown: "# Content here",
  filename: "2026-01-17.md"
}
```

**Security Note:** If input contains `<script>alert('xss')</script>`, output will have script tags removed/neutralized.
