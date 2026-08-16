import { describe, expect, test } from 'bun:test';

import { loadAllLorePosts } from '@/lib/lore/loader';
import { getMcpPost, listMcpPosts, searchMcpPosts } from './content';

const protectedLoreSlug = 'side-moments-familia-inventa';

describe('MCP content access', () => {
  test('uses five posts by default and caps requested results at thirty', async () => {
    const defaultPosts = await listMcpPosts('lore');
    const cappedPosts = await listMcpPosts('lore', 300);

    expect(defaultPosts).toHaveLength(5);
    expect(cappedPosts.length).toBeLessThanOrEqual(30);
  });

  test('excludes password-protected posts from discovery and body searches', async () => {
    const listedPosts = await listMcpPosts('lore', 30);
    const matchingPosts = await searchMcpPosts(
      'lore',
      'A Subway lunch becomes a taxonomy of care',
      30,
    );

    expect(listedPosts.some((post) => post.slug === protectedLoreSlug)).toBe(false);
    expect(matchingPosts).toHaveLength(0);
  });

  test('returns only metadata and a hint when a protected post password is missing or wrong', async () => {
    const missingPassword = await getMcpPost('lore', protectedLoreSlug);
    const wrongPassword = await getMcpPost('lore', protectedLoreSlug, 'incorrect');

    for (const result of [missingPassword, wrongPassword]) {
      expect(result).toMatchObject({
        found: true,
        access: 'password_required',
        post: { slug: protectedLoreSlug },
      });
      expect(result.password_hint).toBeTruthy();
      expect(result.content).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain('matthew-schwartz');
    }
  });

  test('returns normalized plain text after a correct protected-post password', async () => {
    const protectedPost = (await loadAllLorePosts()).find(
      (post) => post.filename === `${protectedLoreSlug}.md`,
    );
    const result = await getMcpPost('lore', protectedLoreSlug, protectedPost?.metadata.password);

    expect(result.access).toBe('granted');
    expect(result.content).toContain('Title: The Cookie That Sat Through Everything');
    expect(result.content).toContain('Body:');
    expect(result.content).not.toContain('matthew-schwartz');
  });

  test('returns a stable not-found result for an unknown slug', async () => {
    expect(await getMcpPost('blog', '2099-01-01')).toEqual({
      found: false,
      access: 'not_found',
    });
  });
});
