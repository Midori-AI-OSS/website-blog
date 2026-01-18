/**
 * Verification script for Post Loader
 * Run with: node --loader ts-node/esm lib/blog/verify-loader.ts
 * Or: npx tsx lib/blog/verify-loader.ts
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  loadAllPosts,
  paginatePosts,
  getPostBySlug,
  getPostsByTag,
  getAllTags,
  getRecentPosts,
} from './loader.js';

const TEST_POSTS_DIR = join(process.cwd(), 'blog/posts');

async function createTestPost(filename: string, content: string) {
  await mkdir(TEST_POSTS_DIR, { recursive: true });
  await writeFile(join(TEST_POSTS_DIR, filename), content, 'utf-8');
}

async function runTests() {
  console.log('🧪 Starting Post Loader Verification\n');

  try {
    // Setup test posts
    console.log('📝 Creating test posts...');
    await rm(TEST_POSTS_DIR, { recursive: true, force: true });
    await mkdir(TEST_POSTS_DIR, { recursive: true });

    await createTestPost('2026-01-17.md', `---
title: First Post
summary: This is the first post
tags: [test, first]
author: Test Author
---

# First Post Content

This is a test post.`);

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

    await createTestPost('invalid-name.md', `---
title: Invalid
---
Should be ignored`);

    console.log('✅ Test posts created\n');

    // Test 1: Load all posts
    console.log('🔍 Test 1: Loading all posts...');
    const posts = await loadAllPosts();
    console.log(`   Found ${posts.length} posts`);
    
    if (posts.length !== 3) {
      throw new Error(`Expected 3 posts, got ${posts.length}`);
    }
    
    // Check sorting (newest first)
    if (!posts[0] || posts[0].filename !== '2026-01-17.md') {
      throw new Error('Posts not sorted correctly');
    }
    console.log('✅ Posts loaded and sorted correctly\n');

    // Test 2: Pagination
    console.log('🔍 Test 2: Testing pagination...');
    const page0 = paginatePosts(posts, 0, 2);
    console.log(`   Page 0: ${page0.posts.length} posts, hasMore: ${page0.hasMore}`);
    
    if (page0.posts.length !== 2 || !page0.hasMore) {
      throw new Error('Pagination failed');
    }
    
    const page1 = paginatePosts(posts, 1, 2);
    console.log(`   Page 1: ${page1.posts.length} posts, hasMore: ${page1.hasMore}`);
    
    if (page1.posts.length !== 1 || page1.hasMore) {
      throw new Error('Pagination page 1 failed');
    }
    console.log('✅ Pagination works correctly\n');

    // Test 3: Get post by slug
    console.log('🔍 Test 3: Finding post by slug...');
    const post = getPostBySlug(posts, '2026-01-17');
    
    if (!post || post.metadata.title !== 'First Post') {
      throw new Error('Failed to find post by slug');
    }
    console.log(`   Found: "${post.metadata.title}"`);
    console.log('✅ Post lookup works correctly\n');

    // Test 4: Filter by tag
    console.log('🔍 Test 4: Filtering by tag...');
    const testPosts = getPostsByTag(posts, 'test');
    console.log(`   Found ${testPosts.length} posts with tag "test"`);
    
    if (testPosts.length !== 2) {
      throw new Error('Tag filtering failed');
    }
    console.log('✅ Tag filtering works correctly\n');

    // Test 5: Get all tags
    console.log('🔍 Test 5: Getting all tags...');
    const tags = getAllTags(posts);
    console.log(`   Found tags: ${tags.join(', ')}`);
    
    if (!tags.includes('test') || !tags.includes('first') || !tags.includes('another')) {
      throw new Error('Missing expected tags');
    }
    console.log('✅ Tag extraction works correctly\n');

    // Test 6: Recent posts
    console.log('🔍 Test 6: Getting recent posts...');
    const recent = getRecentPosts(posts, 2);
    console.log(`   Got ${recent.length} recent posts`);
    
    if (recent.length !== 2) {
      throw new Error('Recent posts failed');
    }
    console.log('✅ Recent posts works correctly\n');

    // Test 7: Security - Invalid slug format
    console.log('🔍 Test 7: Testing security (invalid slug)...');
    const malicious = getPostBySlug(posts, '../../../etc/passwd');
    
    if (malicious !== null) {
      throw new Error('Security: Path traversal not prevented!');
    }
    console.log('✅ Security validation works correctly\n');

    // Test 8: Empty directory
    console.log('🔍 Test 8: Testing empty directory...');
    await rm(TEST_POSTS_DIR, { recursive: true, force: true });
    await mkdir(TEST_POSTS_DIR, { recursive: true });
    
    const emptyPosts = await loadAllPosts();
    console.log(`   Empty directory returned ${emptyPosts.length} posts`);
    
    if (emptyPosts.length !== 0) {
      throw new Error('Empty directory should return 0 posts');
    }
    console.log('✅ Empty directory handled correctly\n');

    // Display example output
    console.log('📊 Example Output:');
    console.log('─────────────────────────────────────────────────');
    
    // Restore test posts for final display
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
    
    const finalPosts = await loadAllPosts();
    const paginatedResult = paginatePosts(finalPosts, 0, 10);
    
    console.log(JSON.stringify(paginatedResult, null, 2));
    console.log('─────────────────────────────────────────────────\n');

    console.log('🎉 All tests passed successfully!');
    console.log('✅ Post loader is working correctly');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
