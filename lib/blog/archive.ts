/**
 * Blog Archive Grouping & Artwork Logic
 *
 * Groups posts into chronological archive periods with month-level merging,
 * and resolves period cover images from the years/ artwork directories.
 */

import type { ParsedPost } from './parser';

/**
 * Minimum post count threshold below which a month group is merged
 * into the next newer month within the same year.
 */
const MERGE_THRESHOLD = 5;

const MONTH_ABBREV = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface ArchivePeriod {
  /** Unique key for this period */
  key: string;
  /** Full section label, e.g. "June-July 2026" */
  label: string;
  /** Year (e.g. 2026) */
  year: number;
  /** Included months (1-indexed, sorted oldest→newest) */
  months: number[];
  /** The newest (highest) month in this period, for picker display */
  newestMonth: number;
  /** Picker label (newest month abbreviation) */
  pickerLabel: string;
  /** Posts in this period, newest-first */
  posts: ParsedPost[];
  /** Resolved cover image URL or null */
  coverImageUrl: string | null;
}

/**
 * Extract year and month from a blog post filename (YYYY-MM-DD.md).
 */
export function extractYearMonth(filename: string): { year: number; month: number } | null {
  const match = filename.match(/^(\d{4})-(\d{2})-\d{2}\.md$/);
  if (!match?.[1] || !match[2]) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Get the month abbreviation for a 1-indexed month.
 * Returns empty string for out-of-range months.
 */
export function getMonthAbbrev(month: number): string {
  if (month < 1 || month > 12) return '';
  // biome-ignore lint/style/noNonNullAssertion: index is validated above
  return MONTH_ABBREV[month - 1]!;
}

/**
 * Generate URL candidates for a period's cover image based on the newest month.
 * Resolution order: same year → earlier years (descending).
 * The caller should try each candidate and fall back to placeholder on 404.
 */
export function getPeriodImageCandidates(month: number, year: number): string[] {
  const abbrev = getMonthAbbrev(month);
  if (!abbrev) return [];

  const candidates: string[] = [];
  // Primary: same year
  candidates.push(`/blog/years/${year}/${abbrev.toLowerCase()}.png`);

  // Earlier years (descending)
  for (let y = year - 1; y >= year - 10 && y > 0; y--) {
    candidates.push(`/blog/years/${y}/${abbrev.toLowerCase()}.png`);
  }

  return candidates;
}

/**
 * Group posts into archive periods with merging logic.
 *
 * Algorithm:
 * 1. Group posts by (year, month) from filename
 * 2. Per year, process months oldest→newest
 * 3. Iteratively merge any below-threshold group into the next newer month
 * 4. Stop merging when group reaches MERGE_THRESHOLD posts OR reaches the year's final month
 * 5. Never merge across years
 *
 * @param posts - Posts sorted newest-first (as returned by loadAllPosts)
 * @returns Archive periods sorted newest-first
 */
export function groupPostsIntoArchivePeriods(posts: ParsedPost[]): ArchivePeriod[] {
  if (posts.length === 0) return [];

  // Step 1: Group by (year, month)
  const monthGroups = new Map<string, ParsedPost[]>();

  for (const post of posts) {
    const ym = extractYearMonth(post.filename);
    if (!ym) continue;
    const key = `${ym.year}-${String(ym.month).padStart(2, '0')}`;
    if (!monthGroups.has(key)) monthGroups.set(key, []);
    monthGroups.get(key)?.push(post);
  }

  // Step 2: Collect all years
  const years = [...new Set([...monthGroups.keys()].map((k) => Number(k.split('-')[0])))].sort(
    (a, b) => a - b,
  );

  const allPeriods: ArchivePeriod[] = [];

  for (const year of years) {
    // Collect months for this year, sorted oldest→newest
    const yearMonthKeys = [...monthGroups.keys()].filter((k) => k.startsWith(`${year}-`)).sort();

    if (yearMonthKeys.length === 0) continue;

    // Build initial unmerged periods
    interface RawPeriod {
      months: number[];
      posts: ParsedPost[];
    }

    const rawPeriods: RawPeriod[] = yearMonthKeys.map((key) => {
      const month = Number(key.split('-')[1]);
      const monthPosts = monthGroups.get(key) ?? [];
      return { months: [month], posts: [...monthPosts] };
    });

    // Step 3: Merge below-threshold groups into newer adjacent (process oldest→newest)
    for (let i = rawPeriods.length - 2; i >= 0; i--) {
      // While current group is below MERGE_THRESHOLD and has a newer neighbor...
      // biome-ignore lint/style/noNonNullAssertion: index bounds enforced by loop and while condition
      while (rawPeriods[i]!.posts.length < MERGE_THRESHOLD && i + 1 < rawPeriods.length) {
        // biome-ignore lint/style/noNonNullAssertion: validated by while condition
        const current = rawPeriods[i]!;
        // biome-ignore lint/style/noNonNullAssertion: validated by while condition
        const next = rawPeriods[i + 1]!;

        // Merge current into next (newer)
        next.months = [...current.months, ...next.months].sort((a, b) => a - b);
        next.posts = [...current.posts, ...next.posts];

        // Remove merged group
        rawPeriods.splice(i, 1);

        // If we removed the last element and i is now beyond array, break
        if (i >= rawPeriods.length) break;
      }
    }

    // Step 4: Build final ArchivePeriod objects
    for (const raw of rawPeriods) {
      // biome-ignore lint/style/noNonNullAssertion: rawPeriods entries always have at least one month
      const newestMonth = raw.months[raw.months.length - 1]!;

      // Generate label
      let label: string;
      if (raw.months.length === 1) {
        // biome-ignore lint/style/noNonNullAssertion: raw.months.length === 1 guarantees element exists
        label = `${MONTH_FULL[raw.months[0]! - 1]} ${year}`;
      } else {
        // biome-ignore lint/style/noNonNullAssertion: raw.months.length > 1 guarantees element exists
        const first = MONTH_FULL[raw.months[0]! - 1];
        const last = MONTH_FULL[newestMonth - 1];
        label = `${first}-${last} ${year}`;
      }

      // Sort posts newest-first within period
      raw.posts.sort((a, b) => b.filename.localeCompare(a.filename));

      allPeriods.push({
        key: `${year}-${String(newestMonth).padStart(2, '0')}`,
        label,
        year,
        months: raw.months,
        newestMonth,
        pickerLabel: MONTH_ABBREV[newestMonth - 1] ?? '',
        posts: raw.posts,
        coverImageUrl: null, // resolved client-side
      });
    }
  }

  // Sort periods newest-first
  allPeriods.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.newestMonth - a.newestMonth;
  });

  return allPeriods;
}

/**
 * Derive unique tags present in a set of posts.
 */
export function getPeriodTags(posts: ParsedPost[]): string[] {
  const tagSet = new Set<string>();
  for (const post of posts) {
    for (const tag of post.metadata.tags ?? []) {
      const trimmed = tag.trim();
      if (trimmed) tagSet.add(trimmed);
    }
  }
  return [...tagSet].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

/**
 * Get the blog placeholder image URL.
 */
export const BLOG_PLACEHOLDER_URL = '/api/blog-images/placeholder.png';
