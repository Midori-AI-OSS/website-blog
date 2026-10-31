/**
 * PR-only validation of front matter on newly added blog and lore posts.
 * Existing posts are deliberately ignored; cover_image is never checked.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import matter from 'gray-matter';

const BLOG_PATH = /^blog\/posts\/[^/]+\.md$/;
const LORE_PATH = /^lore\/posts\/(?:[^/]+\/)*[^/]+\.md$/;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const LORE_SLUG = /^[a-z0-9][a-z0-9-]*$/;

export function isPostPath(path: string): boolean {
  return BLOG_PATH.test(path) || LORE_PATH.test(path);
}

export function selectNewPostPaths(
  changedPaths: string[],
  existedInBase: (path: string) => boolean,
): string[] {
  return [...new Set(changedPaths)].filter((path) => isPostPath(path) && !existedInBase(path));
}

function isCalendarDate(value: string): boolean {
  if (!DATE_FORMAT.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateValue(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

export function validatePostFrontmatter(
  path: string,
  source: string,
  gameExists: (slug: string) => boolean = (slug) =>
    existsSync(join(process.cwd(), 'lore/games', slug, 'index.md')),
): string[] {
  const errors: string[] = [];
  const isBlog = BLOG_PATH.test(path);
  const isLore = LORE_PATH.test(path);
  if (!isBlog && !isLore) return errors;

  const filename = basename(path);
  if (isBlog) {
    const nameDate = filename.slice(0, -3);
    if (!isCalendarDate(nameDate) || filename !== nameDate + '.md') {
      errors.push('blog filename must be a valid YYYY-MM-DD.md date');
    }
  } else if (!LORE_SLUG.test(filename.slice(0, -3))) {
    errors.push('lore filename must be a lowercase hyphenated slug ending in .md');
  }

  // The site parser supports both YAML delimiters.
  const text = source.replace(/^\uFEFF/, '');
  if (!/^(---|\+\+\+)\r?\n/.test(text)) {
    errors.push('YAML front matter must start at the top with --- or +++');
    return errors;
  }

  let data: Record<string, unknown>;
  try {
    data = matter(text, {
      delimiters: text.startsWith('+++') ? '+++' : '---',
    }).data as Record<string, unknown>;
  } catch {
    errors.push('front matter contains invalid YAML');
    return errors;
  }

  for (const key of ['title', 'summary', 'author']) {
    if (typeof data[key] !== 'string' || !(data[key] as string).trim()) {
      errors.push(key + ' must be a non-empty string');
    }
  }

  if (
    !Array.isArray(data.tags) ||
    data.tags.length === 0 ||
    !data.tags.every((tag: unknown) => typeof tag === 'string' && tag.trim().length > 0)
  ) {
    errors.push('tags must be a non-empty YAML list of non-empty strings');
  } else if (isLore && data.tags.some((tag: string) => tag !== tag.trim().toLowerCase())) {
    errors.push('lore tags must be lowercase without surrounding whitespace');
  }

  if (isLore) {
    const date = dateValue(data.date);
    if (date === null || !isCalendarDate(date)) {
      errors.push('date must be a real YYYY-MM-DD date');
    }

    if (typeof data.game !== 'string' || !LORE_SLUG.test(data.game)) {
      errors.push('game must be an existing lowercase lore game slug');
    } else if (!gameExists(data.game)) {
      errors.push('game must refer to lore/games/' + data.game + '/index.md');
    }

    if (typeof data.story_order !== 'number' || !Number.isFinite(data.story_order)) {
      errors.push('story_order must be a finite number');
    }
  }

  // Intentionally no validation of cover_image, image files or image tokens.
  return errors;
}

function gitOutput(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' });
}

export function findNewPostPaths(base: string, head: string): string[] {
  if (!/^[0-9a-f]{40}$/i.test(base) || !/^[0-9a-f]{40}$/i.test(head)) {
    throw new Error('Expected base and head commit SHA arguments');
  }

  // Include renames into a posts directory. Compare path presence against the
  // base tree to distinguish a new page from a modified existing page.
  const changed = gitOutput([
    'diff',
    '--name-only',
    '-z',
    '--diff-filter=ACMRT',
    base,
    head,
    '--',
    'blog/posts',
    'lore/posts',
  ])
    .split('\0')
    .filter(Boolean);

  return selectNewPostPaths(
    changed,
    (path) => spawnSync('git', ['cat-file', '-e', base + ':' + path], { stdio: 'ignore' }).status === 0,
  );
}

export function run(base: string, head: string): number {
  const paths = findNewPostPaths(base, head);
  if (paths.length === 0) {
    console.info('No newly added blog or lore Markdown posts in this PR.');
    return 0;
  }

  let failures = 0;
  for (const path of paths) {
    const errors = validatePostFrontmatter(path, readFileSync(path, 'utf8'));
    if (errors.length === 0) {
      console.info('PASS ' + path);
      continue;
    }

    failures += 1;
    for (const error of errors) {
      console.error('::error file=' + path + '::' + error);
    }
  }

  console.info('Validated ' + paths.length + ' new post(s); ' + failures + ' failed.');
  return failures === 0 ? 0 : 1;
}

if (import.meta.main) {
  try {
    const [base, head] = process.argv.slice(2);
    process.exitCode = run(base ?? '', head ?? '');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
