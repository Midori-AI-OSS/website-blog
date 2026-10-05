import { describe, expect, test } from 'bun:test';
import {
  buildLoreImageReferenceIndex,
  getBlogImageCacheSeconds,
  getLoreImageCacheSeconds,
  getPostAgeCacheSeconds,
  getPostAgeDays,
  getPostImageCacheSeconds,
  IMAGE_CACHE_FALLBACK_SECONDS,
  IMAGE_POST_AGE_ANCHORS,
  IMAGE_STABLE_BLOG_CACHE_SECONDS,
  parseBlogImageDate,
} from './imageCachePolicy';

describe('imageCachePolicy', () => {
  test('uses the Portland calendar date and local time across midnight', () => {
    const beforeMidnight = new Date('2026-05-01T06:59:59.000Z');
    const atMidnight = new Date('2026-05-01T07:00:00.000Z');

    expect(getPostAgeDays('2026-05-01', beforeMidnight)).toBeLessThan(0);
    expect(getPostImageCacheSeconds('2026-05-01', beforeMidnight)).toBe(15);
    expect(getPostImageCacheSeconds('2026-04-30', atMidnight)).toBe(60);
    expect(getPostImageCacheSeconds('2026-05-01', atMidnight)).toBe(15);
  });

  test('returns every post age TTL anchor and linearly interpolates between them', () => {
    for (const anchor of IMAGE_POST_AGE_ANCHORS) {
      expect(getPostAgeCacheSeconds(anchor.ageDays)).toBe(anchor.ttlSeconds);
    }

    expect(getPostAgeCacheSeconds(-0.1)).toBe(15);
    expect(getPostAgeCacheSeconds(0.5)).toBe(15);
    expect(getPostAgeCacheSeconds(1)).toBe(60);
    expect(getPostAgeCacheSeconds(4.5)).toBe(1830);
    expect(getPostAgeCacheSeconds(200)).toBe(90 * 24 * 60 * 60);
  });

  test('uses valid Blog filename dates and safe fallback policies', () => {
    expect(parseBlogImageDate('2026-05-07.png')).toBe('2026-05-07');
    expect(parseBlogImageDate('2026-02-31.png')).toBeNull();
    expect(getBlogImageCacheSeconds('2026-02-31.png')).toBe(IMAGE_CACHE_FALLBACK_SECONDS);
    expect(getBlogImageCacheSeconds('test-image.webp')).toBe(15);
    expect(getBlogImageCacheSeconds('placeholder.png')).toBe(5 * 365 * 24 * 60 * 60);
    expect(getBlogImageCacheSeconds('years/2026/may.png')).toBe(IMAGE_STABLE_BLOG_CACHE_SECONDS);
  });

  test('builds post owners from covers, image tokens, scheduled posts, and game covers', () => {
    const index = buildLoreImageReferenceIndex(
      [
        {
          metadata: { date: '2026-06-01', cover_image: '/lore/shared-art.png' },
          content: '{{image: /lore/body-art.png}}',
        },
        {
          metadata: { date: '2027-01-01', cover_image: '/lore/shared-art.png' },
          content: '{{image: /lore/scheduled-art.png}}',
        },
        {
          metadata: { date: '2020-01-01', cover_image: '/lore/archive-art.png' },
          content: 'Side Moments artwork belongs to its post date.',
        },
        {
          metadata: { date: '2020-01-01', cover_image: '/lore/banner-art.png' },
          content: 'An explicit index cover has stable caching.',
        },
        {
          metadata: { date: 'not-a-date', cover_image: '/lore/undated-art.png' },
          content: '',
        },
      ],
      [
        { coverImage: '/lore/banner-art.png' },
        { coverImage: '/lore/realmomentsbanner-old.png' },
        { coverImage: '/lore/side-moments.png' },
      ],
    );
    const now = new Date('2026-10-05T19:00:00.000Z');

    expect(index.postReferences.get('shared-art.png')?.oldestPostDate).toBe('2026-06-01');
    expect(getLoreImageCacheSeconds('shared-art.png', index, now)).toBe(
      getPostImageCacheSeconds('2026-06-01', now),
    );
    expect(getLoreImageCacheSeconds('body-art.png', index, now)).toBe(
      getPostImageCacheSeconds('2026-06-01', now),
    );
    expect(getLoreImageCacheSeconds('scheduled-art.png', index, now)).toBe(15);
    expect(getLoreImageCacheSeconds('archive-art.png', index, now)).toBe(
      getPostImageCacheSeconds('2020-01-01', now),
    );
    expect(getLoreImageCacheSeconds('banner-art.png', index, now)).toBe(365 * 24 * 60 * 60);
    expect(getLoreImageCacheSeconds('realmomentsbanner-old.png', index, now)).toBe(
      365 * 24 * 60 * 60,
    );
    expect(getLoreImageCacheSeconds('side-moments.png', index, now)).toBe(365 * 24 * 60 * 60);
    expect(getLoreImageCacheSeconds('species-photos/riley.png', index, now)).toBe(
      365 * 24 * 60 * 60,
    );
    expect(getLoreImageCacheSeconds('placeholder.png', index, now)).toBe(5 * 365 * 24 * 60 * 60);
    expect(getLoreImageCacheSeconds('undated-art.png', index, now)).toBe(
      IMAGE_CACHE_FALLBACK_SECONDS,
    );
    expect(getLoreImageCacheSeconds('unreferenced.png', index, now)).toBe(
      IMAGE_CACHE_FALLBACK_SECONDS,
    );
  });
});
