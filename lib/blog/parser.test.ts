/**
 * Unit tests for markdown parser utility
 */

import { describe, test, expect } from 'bun:test';
import { parsePost, parsePosts, extractMetadata } from './parser';

describe('Markdown Parser', () => {
  describe('parsePost', () => {
    test('parses post with full metadata', () => {
      const input = `---
title: Test Post
summary: Test summary
tags: [test, parser]
cover_image: /images/test.jpg
date: 2026-01-17
author: Test Author
---

# Content here

This is test content.`;

      const result = parsePost('2026-01-17.md', input);
      
      expect(result.metadata.title).toBe('Test Post');
      expect(result.metadata.summary).toBe('Test summary');
      expect(result.metadata.tags).toEqual(['test', 'parser']);
      expect(result.metadata.cover_image).toBe('/images/test.jpg');
      expect(result.metadata.date).toBe('2026-01-17');
      expect(result.metadata.author).toBe('Test Author');
      expect(result.content).toContain('# Content here');
      expect(result.filename).toBe('2026-01-17.md');
    });

    test('handles post without metadata', () => {
      const input = '# Just Content\n\nNo front matter here.';
      const result = parsePost('2026-01-17.md', input);
      
      expect(result.metadata.title).toBe('Post from 2026-01-17');
      expect(result.metadata.tags).toEqual([]);
      expect(result.content).toContain('# Just Content');
    });

    test('handles empty front matter', () => {
      const input = `---
---

# Content`;

      const result = parsePost('2026-01-17.md', input);
      
      expect(result.metadata.title).toBe('Post from 2026-01-17');
      expect(result.metadata.tags).toEqual([]);
      expect(result.content).toBe('# Content');
    });

    test('extracts title from filename without date', () => {
      const input = '# Content';
      const result = parsePost('my-blog-post.md', input);
      
      expect(result.metadata.title).toBe('My Blog Post');
    });

    test('handles malformed metadata gracefully', () => {
      const input = `---
title: Valid Title
tags: "not an array"
cover_image: 12345
---

Content`;

      const result = parsePost('test.md', input);
      
      // Should still have valid title
      expect(result.metadata.title).toBe('Valid Title');
      // Invalid fields should be filtered out or defaulted
      expect(result.content).toBe('Content');
    });

    test('sanitizes metadata values', () => {
      const input = `---
title: "  Spaces Around  "
summary: "  Test  "
tags: ["  tag1  ", "  tag2  "]
---

Content`;

      const result = parsePost('test.md', input);
      
      expect(result.metadata.title).toBe('Spaces Around');
      expect(result.metadata.summary).toBe('Test');
      expect(result.metadata.tags).toEqual(['tag1', 'tag2']);
    });

    test('filters out invalid tags', () => {
      const input = `---
title: Test
tags: ["valid", "", "  ", "another"]
---

Content`;

      const result = parsePost('test.md', input);
      
      expect(result.metadata.tags).toEqual(['valid', 'another']);
    });

    test('handles posts with +++ delimiter', () => {
      const input = `+++
title: Test Post
summary: Using plus delimiter
+++

Content`;

      const result = parsePost('test.md', input);
      
      expect(result.metadata.title).toBe('Test Post');
      expect(result.metadata.summary).toBe('Using plus delimiter');
      expect(result.content).toBe('Content');
    });

    test('returns safe defaults on error', () => {
      const result = parsePost('error.md', null as any);
      
      expect(result.metadata.title).toBeTruthy();
      expect(result.content).toBe('');
      expect(result.filename).toBe('error.md');
    });

    test('handles empty content', () => {
      const input = `---
title: Empty Post
---
`;

      const result = parsePost('empty.md', input);
      
      expect(result.metadata.title).toBe('Empty Post');
      expect(result.content).toBe('');
    });

    test('preserves markdown content without conversion', () => {
      const input = `---
title: Test
---

# Heading
**bold** and *italic*
[link](url)`;

      const result = parsePost('test.md', input);
      
      // Content should remain as markdown, not HTML
      expect(result.content).toContain('**bold**');
      expect(result.content).toContain('*italic*');
      expect(result.content).toContain('[link](url)');
      expect(result.content).not.toContain('<strong>');
      expect(result.content).not.toContain('<em>');
    });
  });

  describe('parsePosts', () => {
    test('parses multiple posts', () => {
      const posts = [
        {
          filename: '2026-01-17.md',
          content: '---\ntitle: Post 1\n---\nContent 1'
        },
        {
          filename: '2026-01-18.md',
          content: '---\ntitle: Post 2\n---\nContent 2'
        }
      ];

      const results = parsePosts(posts);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toBeDefined();
      expect(results[0]?.metadata.title).toBe('Post 1');
      expect(results[1]).toBeDefined();
      expect(results[1]?.metadata.title).toBe('Post 2');
    });

    test('handles empty array', () => {
      const results = parsePosts([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('extractMetadata', () => {
    test('extracts metadata without parsing content', () => {
      const input = `---
title: Metadata Only
summary: Just the metadata
tags: [meta, data]
---

# Long content that we don't need to process`;

      const metadata = extractMetadata('test.md', input);
      
      expect(metadata.title).toBe('Metadata Only');
      expect(metadata.summary).toBe('Just the metadata');
      expect(metadata.tags).toEqual(['meta', 'data']);
    });

    test('returns defaults on error', () => {
      const metadata = extractMetadata('error.md', null as any);
      
      expect(metadata.title).toBeTruthy();
      expect(metadata.tags).toEqual([]);
    });
  });

  describe('Security', () => {
    test('does not execute or transform script tags in markdown', () => {
      const input = `---
title: Security Test
---

<script>alert('xss')</script>
<img src=x onerror="alert('xss')">`;

      const result = parsePost('security.md', input);
      
      // Parser should preserve raw markdown (sanitization happens at render time)
      expect(result.content).toContain('<script>');
      expect(result.content).toContain('<img');
      // Note: Actual sanitization will be done by rehype-sanitize in react-markdown
    });

    test('handles malicious metadata safely', () => {
      const input = `---
title: "<script>alert('xss')</script>"
summary: "<img src=x onerror='alert(1)'>"
---

Content`;

      const result = parsePost('test.md', input);
      
      // Metadata should be strings but not execute
      expect(result.metadata.title).toBeTruthy();
      expect(result.metadata.summary).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles very large content', () => {
      const largeContent = 'x'.repeat(100000);
      const input = `---
title: Large Post
---

${largeContent}`;

      const result = parsePost('large.md', input);
      
      expect(result.metadata.title).toBe('Large Post');
      expect(result.content.length).toBeGreaterThan(90000);
    });

    test('handles unicode characters', () => {
      const input = `---
title: 你好世界 🌍
summary: テスト
tags: [中文, 日本語, emoji-🎉]
---

Content with émojis 😀 and àccénts`;

      const result = parsePost('unicode.md', input);
      
      expect(result.metadata.title).toBe('你好世界 🌍');
      expect(result.metadata.summary).toBe('テスト');
      expect(result.metadata.tags).toContain('中文');
      expect(result.content).toContain('😀');
    });

    test('handles Windows line endings', () => {
      const input = `---\r\ntitle: Windows Test\r\n---\r\n\r\nContent with CRLF`;
      const result = parsePost('windows.md', input);
      
      expect(result.metadata.title).toBe('Windows Test');
      expect(result.content).toContain('Content');
    });
  });
});
