import { describe, expect, test } from 'bun:test';
import { isPostPath, selectNewPostPaths, validatePostFrontmatter } from './validate-new-post-frontmatter';

const blog = [
  '---',
  'title: "A new blog entry"',
  'summary: "A useful preview of this entry"',
  'tags: [personal, midori-ai]',
  'author: Riley Midori',
  'cover_image: /blog/pending.png',
  '---',
  '',
  'Body text.',
].join('\n');

const lore = [
  '---',
  'title: "A new chapter"',
  'summary: "A useful preview of this chapter"',
  'tags: [lore, real-moments, riley]',
  'author: Riley Midori',
  'cover_image: /lore/pending.png',
  'date: 2026-10-31',
  'game: real-moments',
  'story_order: 42',
  '---',
  '',
  'Story content.',
].join('\n');

const gameExists = (slug: string) => slug === 'real-moments';

describe('new post selection', () => {
  test('matches blog posts and nested lore posts only', () => {
    expect(isPostPath('blog/posts/2026-10-31.md')).toBe(true);
    expect(isPostPath('lore/posts/real-moments/chapter.md')).toBe(true);
    expect(isPostPath('lore/games/real-moments/index.md')).toBe(false);
    expect(isPostPath('blog/README.md')).toBe(false);
  });

  test('ignores modified existing posts, unrelated files and duplicate filenames', () => {
    const changed = [
      'blog/posts/2026-10-31.md',
      'blog/posts/2026-10-30.md',
      'lore/posts/new-chapter.md',
      'lore/posts/new-chapter.md',
      'README.md',
    ];
    const existing = new Set(['blog/posts/2026-10-30.md']);
    expect(selectNewPostPaths(changed, (path) => existing.has(path))).toEqual([
      'blog/posts/2026-10-31.md',
      'lore/posts/new-chapter.md',
    ]);
  });
});

describe('blog metadata validation', () => {
  test('accepts complete metadata without an existing cover image file', () => {
    expect(validatePostFrontmatter('blog/posts/2026-10-31.md', blog)).toEqual([]);
  });

  test('requires non-empty cover_image but does not check that its file exists', () => {
    const emptyImage = blog.replace('cover_image: /blog/pending.png', 'cover_image: ""');
    expect(validatePostFrontmatter('blog/posts/2026-10-31.md', emptyImage)).toContain(
      'cover_image must be a non-empty string',
    );
  });

  test('reports missing or empty required fields', () => {
    const invalid = ['---', 'title: " "', 'tags: []', '---', '', 'Body'].join('\n');
    expect(validatePostFrontmatter('blog/posts/2026-10-31.md', invalid)).toEqual([
      'title must be a non-empty string',
      'summary must be a non-empty string',
      'author must be a non-empty string',
      'cover_image must be a non-empty string',
      'tags must be a non-empty YAML list of non-empty strings',
    ]);
  });

  test('rejects incorrect tag types and invalid filenames', () => {
    const result = validatePostFrontmatter(
      'blog/posts/2026-02-30.md',
      blog.replace('tags: [personal, midori-ai]', 'tags: personal'),
    );
    expect(result).toContain('blog filename must be a valid YYYY-MM-DD.md date');
    expect(result).toContain('tags must be a non-empty YAML list of non-empty strings');
  });

  test('requires front matter at the start and valid YAML', () => {
    expect(validatePostFrontmatter('blog/posts/2026-10-31.md', '# No metadata')).toContain(
      'YAML front matter must start at the top with --- or +++',
    );
    expect(
      validatePostFrontmatter('blog/posts/2026-10-31.md', '---\ntags: [unterminated\n---'),
    ).toContain('front matter contains invalid YAML');
  });

  test('accepts plus delimiters and a UTF-8 BOM', () => {
    const plus = '\uFEFF' + blog.replace(/^---/m, '+++').replace(/\n---\n/, '\n+++\n');
    expect(validatePostFrontmatter('blog/posts/2026-10-31.md', plus)).toEqual([]);
  });
});

describe('lore metadata validation', () => {
  test('accepts complete metadata with existing game and an uncreated cover image', () => {
    expect(validatePostFrontmatter('lore/posts/real-moments/chapter.md', lore, gameExists)).toEqual([]);
  });

  test('checks dates, story order, tags and game existence', () => {
    const invalid = lore
      .replace('date: 2026-10-31', 'date: 2026-02-30')
      .replace('story_order: 42', 'story_order: first')
      .replace('game: real-moments', 'game: unknown-game')
      .replace('tags: [lore, real-moments, riley]', 'tags: [Lore, riley]');
    const errors = validatePostFrontmatter('lore/posts/chapter.md', invalid, gameExists);
    expect(errors).toContain('date must be a valid ISO 8601 date (YYYY-MM-DD or timestamp with timezone)');
    expect(errors).toContain('story_order must be a finite number');
    expect(errors).toContain('game must refer to lore/games/unknown-game/index.md');
    expect(errors).toContain('lore tags must be lowercase without surrounding whitespace');
  });

  test('rejects missing lore-only fields and invalid game slugs', () => {
    const withoutLoreFields = blog.replace('tags: [personal, midori-ai]', 'tags: [lore]');
    const errors = validatePostFrontmatter('lore/posts/chapter.md', withoutLoreFields, gameExists);
    expect(errors).toContain('date must be a valid ISO 8601 date (YYYY-MM-DD or timestamp with timezone)');
    expect(errors).toContain('game must be an existing lowercase lore game slug');
    expect(errors).toContain('story_order must be a finite number');
  });

  test('rejects invalid lore filenames', () => {
    expect(validatePostFrontmatter('lore/posts/Bad Chapter.md', lore, gameExists)).toContain(
      'lore filename must be a lowercase hyphenated slug ending in .md',
    );
  });
});

describe('supported metadata schema', () => {
  test('rejects unknown keys and catches misspelled front matter', () => {
    const bad = blog + '\n';
    expect(validatePostFrontmatter('blog/posts/2026-10-31.md', bad.replace('author:', 'auther:'))).toContain(
      'unknown front matter field "auther" (check for typos)',
    );
  });

  test('checks optional fields without requiring them', () => {
    const invalid = blog.replace('cover_image:', 'povs_enabled: yes\nstory_order: first\nepisode_label: []\ncover_image:');
    const errors = validatePostFrontmatter('blog/posts/2026-10-31.md', invalid);
    expect(errors).toContain('povs_enabled must be a boolean');
    expect(errors).toContain('story_order must be a finite number');
    expect(errors).toContain('episode_label must be a non-empty string when provided');
  });

  test('checks password hint dependencies and optional dates', () => {
    const bad = blog.replace('cover_image:', 'password_hint: clue\ndate: 2026-02-30\ncover_image:');
    const errors = validatePostFrontmatter('blog/posts/2026-10-31.md', bad);
    expect(errors).toContain('password_hint requires password');
    expect(errors).toContain('date must be a valid ISO 8601 date (YYYY-MM-DD or timestamp with timezone)');
  });
});
