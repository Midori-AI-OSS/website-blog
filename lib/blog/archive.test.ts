/**
 * Tests for Blog Archive Grouping & Artwork Resolution
 */

import { describe, expect, test } from 'bun:test';
import {
  BLOG_PLACEHOLDER_URL,
  extractYearMonth,
  getMonthAbbrev,
  getPeriodImageCandidates,
  getPeriodTags,
  groupPostsIntoArchivePeriods,
} from './archive';
import type { ParsedPost } from './parser';

function makePost(filename: string, tags: string[] = []): ParsedPost {
  return {
    filename,
    metadata: {
      title: `Post ${filename}`,
      tags,
    },
    content: '# Test',
  } as ParsedPost;
}

describe('extractYearMonth', () => {
  test('extracts year and month from valid filename', () => {
    expect(extractYearMonth('2026-01-17.md')).toEqual({ year: 2026, month: 1 });
    expect(extractYearMonth('2026-06-14.md')).toEqual({ year: 2026, month: 6 });
    expect(extractYearMonth('2026-12-31.md')).toEqual({ year: 2026, month: 12 });
  });

  test('returns null for invalid filenames', () => {
    expect(extractYearMonth('invalid.md')).toBeNull();
    expect(extractYearMonth('2026-13-01.md')).toBeNull();
    expect(extractYearMonth('foobar')).toBeNull();
  });
});

describe('getMonthAbbrev', () => {
  test('returns correct abbreviations', () => {
    expect(getMonthAbbrev(1)).toBe('Jan');
    expect(getMonthAbbrev(6)).toBe('Jun');
    expect(getMonthAbbrev(7)).toBe('Jul');
    expect(getMonthAbbrev(12)).toBe('Dec');
  });

  test('returns empty string for out-of-range months', () => {
    expect(getMonthAbbrev(0)).toBe('');
    expect(getMonthAbbrev(13)).toBe('');
    expect(getMonthAbbrev(-1)).toBe('');
  });
});

describe('getPeriodImageCandidates', () => {
  test('generates candidates starting with same year', () => {
    const candidates = getPeriodImageCandidates(6, 2026);
    expect(candidates[0]).toBe('/blog/years/2026/jun.png');
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates[1]).toBe('/blog/years/2025/jun.png');
  });

  test('generates candidates for edge months', () => {
    const candidates = getPeriodImageCandidates(1, 2026);
    expect(candidates[0]).toBe('/blog/years/2026/jan.png');
    expect(candidates[candidates.length - 1]).toBe('/blog/years/2016/jan.png');
  });

  test('returns empty array for invalid month', () => {
    expect(getPeriodImageCandidates(0, 2026)).toEqual([]);
    expect(getPeriodImageCandidates(13, 2026)).toEqual([]);
  });

  test('stops at year 1', () => {
    const candidates = getPeriodImageCandidates(3, 2020);
    // Should not go below year 1
    for (const c of candidates) {
      const match = c.match(/\/blog\/years\/(\d+)\//);
      if (match) {
        expect(Number(match[1])).toBeGreaterThan(0);
      }
    }
  });
});

describe('getPeriodTags', () => {
  test('extracts unique sorted tags', () => {
    const posts = [
      makePost('2026-01-17.md', ['tag-a', 'tag-b']),
      makePost('2026-01-19.md', ['tag-b', 'tag-c']),
    ];
    const tags = getPeriodTags(posts);
    expect(tags).toEqual(['tag-a', 'tag-b', 'tag-c']);
  });

  test('handles empty tags', () => {
    const posts = [makePost('2026-01-17.md', [])];
    const tags = getPeriodTags(posts);
    expect(tags).toEqual([]);
  });

  test('handles undefined tags', () => {
    const posts = [makePost('2026-01-17.md')];
    const tags = getPeriodTags(posts);
    expect(tags).toEqual([]);
  });

  test('case-insensitive sort', () => {
    const posts = [makePost('2026-01-17.md', ['Zebra', 'alpha', 'Beta'])];
    const tags = getPeriodTags(posts);
    expect(tags).toEqual(['alpha', 'Beta', 'Zebra']);
  });
});

describe('BLOG_PLACEHOLDER_URL', () => {
  test('has the correct placeholder value', () => {
    expect(BLOG_PLACEHOLDER_URL).toBe('/api/blog-images/placeholder.png');
  });
});

describe('fallback chain', () => {
  test('getPeriodImageCandidates returns empty for invalid month, requiring caller fallback', () => {
    const candidates = getPeriodImageCandidates(0, 2026);
    expect(candidates).toEqual([]);
    // When candidates are empty, the caller should use BLOG_PLACEHOLDER_URL
  });

  test('getPeriodImageCandidates for valid month/year returns same-year candidate first', () => {
    const candidates = getPeriodImageCandidates(6, 2026);
    expect(candidates[0]).toBe('/blog/years/2026/jun.png');
  });

  test('getPeriodImageCandidates for valid month/year returns earlier-year candidates', () => {
    const candidates = getPeriodImageCandidates(6, 2026);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates[1]).toBe('/blog/years/2025/jun.png');
  });

  test('BLOG_PLACEHOLDER_URL is a valid non-empty API path', () => {
    expect(BLOG_PLACEHOLDER_URL.length).toBeGreaterThan(0);
    expect(BLOG_PLACEHOLDER_URL.startsWith('/api/')).toBe(true);
  });
});

describe('groupPostsIntoArchivePeriods', () => {
  test('returns empty array for no posts', () => {
    expect(groupPostsIntoArchivePeriods([])).toEqual([]);
  });

  test('groups single-month period correctly', () => {
    const posts = [
      makePost('2026-01-25.md'),
      makePost('2026-01-23.md'),
      makePost('2026-01-21.md'),
      makePost('2026-01-19.md'),
      makePost('2026-01-17.md'),
    ];

    const groups = groupPostsIntoArchivePeriods(posts);
    expect(groups.length).toBe(1);
    expect(groups[0]?.label).toBe('January 2026');
    expect(groups[0]?.months).toEqual([1]);
    expect(groups[0]?.posts.length).toBe(5);
    // newest-first
    expect(groups[0]?.posts[0]?.filename).toBe('2026-01-25.md');
    expect(groups[0]?.posts[4]?.filename).toBe('2026-01-17.md');
  });

  test('merges under-5 group into newer adjacent month', () => {
    // May: 3 posts, Jun: 2 posts -> Jun merges into May (newer), but Jun is newer so May merges into Jun
    // Wait: newer means higher month number. Jun (6) merges into Jul (7). But if Jul has 1 post...
    // Let's simulate: Jan (5 posts), Feb (2 posts). Feb < 5 so merges into Mar (3 posts) → 5 total
    const posts = [
      // Feb: 2 posts (under 5)
      makePost('2026-02-10.md'),
      makePost('2026-02-05.md'),
      // Mar: 3 posts (under 5)
      makePost('2026-03-20.md'),
      makePost('2026-03-15.md'),
      makePost('2026-03-10.md'),
      // Jan: 5 posts
      makePost('2026-01-25.md'),
      makePost('2026-01-23.md'),
      makePost('2026-01-21.md'),
      makePost('2026-01-19.md'),
      makePost('2026-01-17.md'),
    ];

    const groups = groupPostsIntoArchivePeriods(posts);

    // Feb (2) merges into Mar (3) = 5 → Feb-Mar group
    // Jan stays separate (5)

    const labels = groups.map((g) => g.label);
    // Newest first: Feb-Mar comes before Jan
    expect(labels).toContain('February-March 2026');
    expect(labels).toContain('January 2026');
    expect(groups.length).toBe(2);
  });

  test('does not merge across years', () => {
    const posts = [
      // Jan 2026: 2 posts (under 5) — but no newer month in 2026 since this IS Jan
      makePost('2026-01-10.md'),
      makePost('2026-01-05.md'),
      // Dec 2025: 3 posts
      makePost('2025-12-20.md'),
      makePost('2025-12-15.md'),
      makePost('2025-12-10.md'),
    ];

    const groups = groupPostsIntoArchivePeriods(posts);

    // Each is under 5 but they're in different years, so no merging
    // Jan 2026: stays at 2
    // Dec 2025: stays at 3
    expect(groups.length).toBe(2);

    // Verify posts are isolated per group
    const janGroup = groups.find((g) => g.year === 2026 && g.months.includes(1));
    expect(janGroup).toBeDefined();
    expect(janGroup?.posts.length).toBe(2);

    const decGroup = groups.find((g) => g.year === 2025 && g.months.includes(12));
    expect(decGroup).toBeDefined();
    expect(decGroup?.posts.length).toBe(3);
  });

  test('expected 2026 grouping: Jan, Feb, Mar, Apr, May, Jun-Jul', () => {
    // Simulate the actual post distribution
    const posts = [
      // Jul: 1
      makePost('2026-07-09.md'),
      // Jun: 2
      makePost('2026-06-14.md'),
      makePost('2026-06-05.md'),
      // May: 6
      makePost('2026-05-30.md'),
      makePost('2026-05-29.md'),
      makePost('2026-05-21.md'),
      makePost('2026-05-16.md'),
      makePost('2026-05-07.md'),
      makePost('2026-05-02.md'),
      // Apr: 7
      makePost('2026-04-28.md'),
      makePost('2026-04-25.md'),
      makePost('2026-04-24.md'),
      makePost('2026-04-13.md'),
      makePost('2026-04-08.md'),
      makePost('2026-04-07.md'),
      makePost('2026-04-05.md'),
      // Mar: 7
      makePost('2026-03-29.md'),
      makePost('2026-03-26.md'),
      makePost('2026-03-24.md'),
      makePost('2026-03-20.md'),
      makePost('2026-03-13.md'),
      makePost('2026-03-06.md'),
      makePost('2026-03-04.md'),
      // Feb: 10
      makePost('2026-02-27.md'),
      makePost('2026-02-24.md'),
      makePost('2026-02-22.md'),
      makePost('2026-02-20.md'),
      makePost('2026-02-14.md'),
      makePost('2026-02-11.md'),
      makePost('2026-02-09.md'),
      makePost('2026-02-07.md'),
      makePost('2026-02-06.md'),
      makePost('2026-02-03.md'),
      // Jan: 7
      makePost('2026-01-26.md'),
      makePost('2026-01-25.md'),
      makePost('2026-01-23.md'),
      makePost('2026-01-22.md'),
      makePost('2026-01-21.md'),
      makePost('2026-01-19.md'),
      makePost('2026-01-17.md'),
    ];

    const groups = groupPostsIntoArchivePeriods(posts);
    const labels = groups.map((g) => g.label);

    // Expected: Jun-Jul 2026 (newest), May, Apr, Mar, Feb, Jan
    expect(groups.length).toBe(6);

    expect(labels[0]).toBe('June-July 2026');
    expect(labels[1]).toBe('May 2026');
    expect(labels[2]).toBe('April 2026');
    expect(labels[3]).toBe('March 2026');
    expect(labels[4]).toBe('February 2026');
    expect(labels[5]).toBe('January 2026');

    // Verify post counts
    const junJul = groups.find((g) => g.label === 'June-July 2026');
    expect(junJul?.posts.length).toBe(3); // 2 Jun + 1 Jul
    expect(junJul?.months).toEqual([6, 7]);
    expect(junJul?.newestMonth).toBe(7);
    expect(junJul?.pickerLabel).toBe('Jul');

    const may = groups.find((g) => g.label === 'May 2026');
    expect(may?.posts.length).toBe(6);

    const jan = groups.find((g) => g.label === 'January 2026');
    expect(jan?.posts.length).toBe(7);
    expect(jan?.newestMonth).toBe(1);
    expect(jan?.pickerLabel).toBe('Jan');
  });

  test('every post appears exactly once', () => {
    const posts = [
      makePost('2026-03-20.md'),
      makePost('2026-03-15.md'),
      makePost('2026-03-10.md'),
      makePost('2026-03-05.md'),
      makePost('2026-03-01.md'),
      makePost('2026-02-20.md'),
      makePost('2026-02-10.md'),
      makePost('2026-01-10.md'),
    ];

    const totalPostCount = posts.length;
    const groups = groupPostsIntoArchivePeriods(posts);
    const groupedCount = groups.reduce((sum, g) => sum + g.posts.length, 0);

    expect(groupedCount).toBe(totalPostCount);

    // Verify no duplicates
    const allFilenames = groups.flatMap((g) => g.posts.map((p) => p.filename));
    const unique = new Set(allFilenames);
    expect(unique.size).toBe(totalPostCount);
  });

  test('posts within each group are newest-first', () => {
    const posts = [
      makePost('2026-02-10.md'),
      makePost('2026-02-05.md'),
      makePost('2026-02-03.md'),
      makePost('2026-02-01.md'),
      makePost('2026-02-15.md'), // out of order input
    ];

    const groups = groupPostsIntoArchivePeriods(posts);
    expect(groups.length).toBe(1);
    expect(groups[0]?.posts[0]?.filename).toBe('2026-02-15.md');
    expect(groups[0]?.posts[4]?.filename).toBe('2026-02-01.md');
  });

  test('groups are newest-first', () => {
    const posts = [
      makePost('2026-04-01.md'),
      makePost('2026-04-02.md'),
      makePost('2026-04-03.md'),
      makePost('2026-04-04.md'),
      makePost('2026-04-05.md'),
      makePost('2026-01-01.md'),
      makePost('2026-01-02.md'),
      makePost('2026-01-03.md'),
      makePost('2026-01-04.md'),
      makePost('2026-01-05.md'),
    ];

    const groups = groupPostsIntoArchivePeriods(posts);
    expect(groups.length).toBe(2);
    // Newest first: April then January
    expect(groups[0]?.months).toEqual([4]);
    expect(groups[1]?.months).toEqual([1]);
  });
});
