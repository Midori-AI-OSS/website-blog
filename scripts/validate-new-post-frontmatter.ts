/**
 * PR-only validation of front matter on newly added blog and lore posts.
 * Existing posts are deliberately ignored. Image files are never checked.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import matter from 'gray-matter';

const BLOG_PATH = /^blog\/posts\/[^/]+\.md$/;
const LORE_PATH = /^lore\/posts\/(?:[^/]+\/)*[^/]+\.md$/;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const LORE_SLUG = /^[a-z0-9][a-z0-9-]*$/;

// Match the metadata consumed by lib/blog/parser.ts (shared by blog and lore).
// Unknown keys are errors so typos never silently fall back to defaults.
const TEXT_FIELDS = [
  'title',
  'summary',
  'cover_image',
  'author',
  'episode_label',
  'password',
  'password_hint',
  'full_story_pov',
  'full_story_tooltip',
] as const;
const NUMERIC_FIELDS = ['story_order', 'display_weight'] as const;
const ALLOWED_FIELDS = new Set([
  ...TEXT_FIELDS,
  ...NUMERIC_FIELDS,
  'tags',
  'date',
  'game',
  'povs_enabled',
]);
const REQUIRED_TEXT_FIELDS = ['title', 'summary', 'author', 'cover_image'] as const;

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

function isIsoDate(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match || !isCalendarDate(match[1] ?? '')) return false;
  if (!match[2]) return true;

  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  const seconds = Number(match[4]);
  if (hours > 23 || minutes > 59 || seconds > 59) return false;

  const timezone = match[5] ?? '';
  if (timezone !== 'Z') {
    const tzHours = Number(timezone.slice(1, 3));
    const tzMinutes = Number(timezone.slice(4, 6));
    if (tzHours > 23 || tzMinutes > 59) return false;
  }
  return true;
}

function readRawDate(frontmatter: string): string | null {
  // js-yaml converts unquoted YAML dates to Date, rolling invalid days into
  // another month. Check the authored value instead of the normalized Date.
  const line = frontmatter.split(/\r?\n/).find((entry) => /^date\s*:/.test(entry));
  if (!line) return null;
  const value = line.slice(line.indexOf(':') + 1).replace(/\s+#.*$/, '').trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
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

  // Match the delimiters supported by the runtime parser.
  const text = source.replace(/^\uFEFF/, '');
  const delimiter = text.startsWith('+++') ? '+++' : '---';
  const lines = text.split(/\r?\n/);
  if (lines[0] !== delimiter) {
    errors.push('YAML front matter must start at the top with --- or +++');
    return errors;
  }

  const closingLine = lines.findIndex((line, index) => index > 0 && line === delimiter);
  if (closingLine < 0) {
    errors.push('front matter must have a matching closing ' + delimiter + ' delimiter');
    return errors;
  }

  let data: Record<string, unknown>;
  try {
    const parsed = matter(text, { delimiters: delimiter }).data;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push('front matter must be a YAML mapping of field names to values');
      return errors;
    }
    data = parsed as Record<string, unknown>;
  } catch {
    errors.push('front matter contains invalid YAML');
    return errors;
  }

  for (const key of Object.keys(data)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.push('unknown front matter field "' + key + '" (check for typos)');
    }
  }

  for (const key of REQUIRED_TEXT_FIELDS) {
    if (typeof data[key] !== 'string' || !data[key].trim()) {
      errors.push(key + ' must be a non-empty string');
    }
  }

  for (const key of TEXT_FIELDS) {
    if (
      !REQUIRED_TEXT_FIELDS.includes(key as (typeof REQUIRED_TEXT_FIELDS)[number]) &&
      data[key] !== undefined &&
      (typeof data[key] !== 'string' || !data[key].trim())
    ) {
      errors.push(key + ' must be a non-empty string when provided');
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

  const rawDate = readRawDate(lines.slice(1, closingLine).join('\n'));
  if (isLore || data.date !== undefined) {
    if (rawDate === null || !isIsoDate(rawDate)) {
      errors.push('date must be a valid ISO 8601 date (YYYY-MM-DD or timestamp with timezone)');
    }
  }

  if (isLore || data.game !== undefined) {
    if (typeof data.game !== 'string' || !LORE_SLUG.test(data.game)) {
      errors.push('game must be an existing lowercase lore game slug');
    } else if (!gameExists(data.game)) {
      errors.push('game must refer to lore/games/' + data.game + '/index.md');
    }
  }

  for (const key of NUMERIC_FIELDS) {
    if (key === 'story_order' && isLore || data[key] !== undefined) {
      if (typeof data[key] !== 'number' || !Number.isFinite(data[key])) {
        errors.push(key + ' must be a finite number');
      }
    }
  }

  if (data.povs_enabled !== undefined && typeof data.povs_enabled !== 'boolean') {
    errors.push('povs_enabled must be a boolean');
  }

  if (data.password_hint !== undefined && data.password === undefined) {
    errors.push('password_hint requires password');
  }

  // A cover_image value is required, but neither its path nor the image file
  // (or embedded image tokens) are validated. Images may be added later.
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
