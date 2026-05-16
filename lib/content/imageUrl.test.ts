import { describe, expect, test } from 'bun:test';

import {
  POST_COVER_PLACEHOLDER_IMAGE,
  POST_COVER_PLACEHOLDER_IMAGE_URL,
  resolvePostCoverImageUrl,
  transformPostImageUrl,
} from './imageUrl';

describe('imageUrl', () => {
  test('transforms blog cover paths through the blog image API', () => {
    expect(transformPostImageUrl('/blog/2026-05-07.png')).toBe('/api/blog-images/2026-05-07.png');
  });

  test('transforms lore cover paths through the lore image API', () => {
    expect(transformPostImageUrl('/lore/story cover.png')).toBe(
      '/api/lore-images/story%20cover.png',
    );
  });

  test('uses the blog placeholder when a cover is missing', () => {
    expect(resolvePostCoverImageUrl(undefined)).toBe('/api/blog-images/placeholder.png');
    expect(resolvePostCoverImageUrl(null)).toBe('/api/blog-images/placeholder.png');
  });

  test('uses the blog placeholder when a cover is blank', () => {
    expect(resolvePostCoverImageUrl('   ')).toBe('/api/blog-images/placeholder.png');
  });

  test('keeps explicit cover paths and external URLs intact after normalization', () => {
    expect(resolvePostCoverImageUrl('/lore/echo.png')).toBe('/api/lore-images/echo.png');
    expect(resolvePostCoverImageUrl('https://example.com/cover.png')).toBe(
      'https://example.com/cover.png',
    );
    expect(POST_COVER_PLACEHOLDER_IMAGE).toBe('/blog/placeholder.png');
    expect(POST_COVER_PLACEHOLDER_IMAGE_URL).toBe('/api/blog-images/placeholder.png');
  });
});
