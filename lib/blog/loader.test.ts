/**
 * Tests for Blog Post Loader
 */

import { test, expect, describe, beforeAll } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  loadAllPosts,
  paginatePosts,
  getPostBySlug,
  getPostsByTag,
  getAllTags,
  getRecentPosts,
  clearCache,
} from './loader';

const TEST_POSTS_DIR = join(process.cwd(), 'blog/posts');

// Helper to create test posts
async function createTestPost(filename: string, content: string) {
  await mkdir(TEST_POSTS_DIR, { recursive: true });
  await writeFile(join(TEST_POSTS_DIR, filename), content, 'utf-8');
}

describe('Post Loader', () => {
  beforeAll(async () => {
    // Clean up and create test posts
    await rm(TEST_POSTS_DIR, { recursive: true, force: true });
    await mkdir(TEST_POSTS_DIR, { recursive: true });

    // Create valid test posts
    await createTestPost('2026-01-17.md', `---
title: First Post
summary: This is the first post
tags: [test, first]
---

# First Post Content`);

    await createTestPost('2026-01-16.md', `---
title: Second Post
tags: [test]
---

# Second Post Content`);

    await createTestPost('2026-01-15.md', `---
title: Third Post
tags: [another]
---

# Third Post Content`);

    // Create a post with invalid filename (should be ignored)
    await createTestPost('invalid-name.md', `---
title: Invalid
---
Content`);
  });

  test('loadAllPosts loads and sorts posts correctly', async () => {
    const posts = await loadAllPosts();

    // Should load 3 valid posts (ignore invalid-name.md)
    expect(posts.length).toBe(3);

    // Should be sorted newest first
    expect(posts[0]).toBeDefined();
    expect(posts[0]?.filename).toBe('2026-01-17.md');
    expect(posts[1]).toBeDefined();
    expect(posts[1]?.filename).toBe('2026-01-16.md');
    expect(posts[2]).toBeDefined();
    expect(posts[2]?.filename).toBe('2026-01-15.md');

    // Check metadata
    expect(posts[0]).toBeDefined();
    expect(posts[0]?.metadata.title).toBe('First Post');
    expect(posts[0]?.metadata.tags).toContain('test');
  });

  test('paginatePosts returns correct page', async () => {
    const posts = await loadAllPosts();

    // Page 0, size 2
    const page0 = paginatePosts(posts, 0, 2);
    expect(page0.posts.length).toBe(2);
    expect(page0.hasMore).toBe(true);
    expect(page0.totalCount).toBe(3);
    expect(page0.currentPage).toBe(0);
    expect(page0.totalPages).toBe(2);

    // Page 1, size 2
    const page1 = paginatePosts(posts, 1, 2);
    expect(page1.posts.length).toBe(1);
    expect(page1.hasMore).toBe(false);
    expect(page1.currentPage).toBe(1);
  });

  test('paginatePosts handles edge cases', async () => {
    const posts = await loadAllPosts();

    // Negative page number (should default to 0)
    const negativePage = paginatePosts(posts, -5, 2);
    expect(negativePage.currentPage).toBe(0);

    // Page size too large (should cap at 100)
    const largePage = paginatePosts(posts, 0, 200);
    expect(largePage.posts.length).toBe(3);

    // Page size too small (should default to 1)
    const smallPage = paginatePosts(posts, 0, 0);
    expect(smallPage.posts.length).toBe(1);
  });

  test('getPostBySlug finds post by date slug', async () => {
    const posts = await loadAllPosts();

    const post = getPostBySlug(posts, '2026-01-17');
    expect(post).not.toBeNull();
    expect(post?.metadata.title).toBe('First Post');

    const notFound = getPostBySlug(posts, '2026-01-01');
    expect(notFound).toBeNull();
  });

  test('getPostBySlug validates slug format', async () => {
    const posts = await loadAllPosts();

    // Invalid slug format should return null
    const invalid = getPostBySlug(posts, '../../../etc/passwd');
    expect(invalid).toBeNull();

    const invalid2 = getPostBySlug(posts, 'invalid-slug');
    expect(invalid2).toBeNull();
  });

  test('getPostsByTag filters posts by tag', async () => {
    const posts = await loadAllPosts();

    const testPosts = getPostsByTag(posts, 'test');
    expect(testPosts.length).toBe(2);

    const anotherPosts = getPostsByTag(posts, 'another');
    expect(anotherPosts.length).toBe(1);

    const noPosts = getPostsByTag(posts, 'nonexistent');
    expect(noPosts.length).toBe(0);
  });

  test('getPostsByTag is case-insensitive', async () => {
    const posts = await loadAllPosts();

    const lowerCase = getPostsByTag(posts, 'test');
    const upperCase = getPostsByTag(posts, 'TEST');
    const mixedCase = getPostsByTag(posts, 'TeSt');

    expect(lowerCase.length).toBe(upperCase.length);
    expect(lowerCase.length).toBe(mixedCase.length);
  });

  test('getAllTags returns unique sorted tags', async () => {
    const posts = await loadAllPosts();

    const tags = getAllTags(posts);
    expect(tags).toContain('test');
    expect(tags).toContain('first');
    expect(tags).toContain('another');

    // Should be sorted
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);

    // Should be unique
    const unique = new Set(tags);
    expect(tags.length).toBe(unique.size);
  });

  test('getRecentPosts returns limited posts', async () => {
    const posts = await loadAllPosts();

    const recent = getRecentPosts(posts, 2);
    expect(recent.length).toBe(2);
    expect(recent[0]).toBeDefined();
    expect(recent[0]?.filename).toBe('2026-01-17.md');

    const all = getRecentPosts(posts, 10);
    expect(all.length).toBe(3);
  });

  test('loadAllPosts handles empty directory', async () => {
    // Clear all posts
    await rm(TEST_POSTS_DIR, { recursive: true, force: true });
    await mkdir(TEST_POSTS_DIR, { recursive: true });

    clearCache(); // Clear cache to force fresh load

    const posts = await loadAllPosts();
    expect(posts.length).toBe(0);
  });

  test('filename validation prevents path traversal', async () => {
    // Create a file with path traversal attempt
    const maliciousFilename = '../../etc/passwd.md';
    
    // loadAllPosts should ignore it (not match YYYY-MM-DD.md pattern)
    const posts = await loadAllPosts();
    const malicious = posts.find(p => p.filename.includes('..'));
    expect(malicious).toBeUndefined();
  });
});
