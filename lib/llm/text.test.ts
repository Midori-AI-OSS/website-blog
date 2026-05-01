import { describe, expect, test } from 'bun:test';

import type { ParsedPost } from '@/lib/blog/parser';

import {
  buildLlmPostEntries,
  normalizeMarkdownForLlm,
  renderLlmIndexText,
  renderLlmPostText,
} from './text';

function makePost({
  filename,
  title,
  summary,
  tags,
  author,
  coverImage,
  date,
  content,
}: {
  filename: string;
  title: string;
  summary?: string;
  tags?: string[];
  author?: string;
  coverImage?: string;
  date?: string;
  content: string;
}): ParsedPost {
  return {
    filename,
    content,
    rawMarkdown: content,
    metadata: {
      title,
      summary,
      tags,
      author,
      cover_image: coverImage,
      date,
    },
  };
}

describe('LLM text formatters', () => {
  test('buildLlmPostEntries maps blog and lore paths', () => {
    const blogPost = makePost({
      filename: '2026-04-28.md',
      title: 'Blog Entry',
      content: 'Hello world',
    });
    const lorePost = makePost({
      filename: 'the-story.md',
      title: 'Lore Entry',
      date: '2026-04-18',
      content: 'Lore body',
    });

    const [blogEntry] = buildLlmPostEntries('blog', [blogPost]);
    const [loreEntry] = buildLlmPostEntries('lore', [lorePost]);

    expect(blogEntry?.canonicalPath).toBe('/blog/2026-04-28');
    expect(blogEntry?.llmPath).toBe('/llm/blog/2026-04-28');
    expect(blogEntry?.sourcePath).toBe('blog/posts/2026-04-28.md');
    expect(blogEntry?.publishDate).toBe('2026-04-28');

    expect(loreEntry?.canonicalPath).toBe('/lore/the-story');
    expect(loreEntry?.llmPath).toBe('/llm/lore/the-story');
    expect(loreEntry?.sourcePath).toBe('lore/posts/the-story.md');
    expect(loreEntry?.publishDate).toBe('2026-04-18');
  });

  test('normalizeMarkdownForLlm converts lore tokens and markdown links', () => {
    const markdown = [
      '# Heading',
      '',
      'See [guide](/lore/example).',
      '',
      '{{image: /lore/the-story-luna-midori/01-veiled-crossing-first-shift.png}}',
      '',
      '![Cover](/blog/placeholder.png)',
      '',
      '`inline` and **bold** text',
    ].join('\n');

    const normalized = normalizeMarkdownForLlm(markdown);

    expect(normalized.plainText).toContain('Heading');
    expect(normalized.plainText).toContain('guide (/lore/example)');
    expect(normalized.plainText).toContain('Image (Lore image): /api/lore-images/the-story-luna-midori/01-veiled-crossing-first-shift.png');
    expect(normalized.plainText).toContain('Image (Cover): /api/blog-images/placeholder.png');
    expect(normalized.plainText).toContain('inline and bold text');

    expect(normalized.imageUrls).toContain('/api/lore-images/the-story-luna-midori/01-veiled-crossing-first-shift.png');
    expect(normalized.imageUrls).toContain('/api/blog-images/placeholder.png');
  });

  test('renderLlmIndexText lists entries with site and llm paths', () => {
    const blogEntries = buildLlmPostEntries('blog', [
      makePost({
        filename: '2026-04-28.md',
        title: 'Blog Entry',
        summary: 'Summary text',
        content: 'Body',
      }),
    ]);
    const loreEntries = buildLlmPostEntries('lore', [
      makePost({
        filename: 'lore-entry.md',
        title: 'Lore Entry',
        date: '2026-04-20',
        content: 'Body',
      }),
    ]);

    const text = renderLlmIndexText(blogEntries, loreEntries);

    expect(text).toContain('Midori AI LLM Text Index');
    expect(text).toContain('Blog Posts (1)');
    expect(text).toContain('Lore Posts (1)');
    expect(text).toContain('Blog Entry | site: /blog/2026-04-28 | llm: /llm/blog/2026-04-28');
    expect(text).toContain('Lore Entry | site: /lore/lore-entry | llm: /llm/lore/lore-entry');
  });

  test('renderLlmPostText includes metadata, image links, and body', () => {
    const post = makePost({
      filename: 'lore-entry.md',
      title: 'Lore Entry',
      summary: 'Lore summary',
      tags: ['lore', 'echo'],
      author: 'Luna Midori',
      coverImage: '/lore/echo.png',
      date: '2026-04-20',
      content: [
        'Text paragraph.',
        '',
        '{{image: /lore/echo/echo1.png}}',
      ].join('\n'),
    });

    const text = renderLlmPostText('lore', post);

    expect(text).toContain('Title: Lore Entry');
    expect(text).toContain('Canonical URL: /lore/lore-entry');
    expect(text).toContain('LLM URL: /llm/lore/lore-entry');
    expect(text).toContain('Cover Image: /api/lore-images/echo.png');
    expect(text).toContain('Image Links:');
    expect(text).toContain('/api/lore-images/echo/echo1.png');
    expect(text).toContain('Body:');
    expect(text).toContain('Text paragraph.');
  });
});
