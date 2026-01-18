/**
 * BlogList Component Test/Demo
 * 
 * Quick verification that the component renders and functions correctly.
 * This is a simple test file, not a comprehensive test suite.
 */

import { BlogList } from './BlogList';
import type { ParsedPost } from '../../lib/blog/parser';

// Mock test data
const mockPosts: ParsedPost[] = Array.from({ length: 25 }, (_, i) => ({
  filename: `2024-01-${String(i + 1).padStart(2, '0')}-test-post-${i + 1}.md`,
  metadata: {
    title: `Test Post ${i + 1}`,
    summary: `This is a summary for test post ${i + 1}. It demonstrates the BlogList component.`,
    tags: ['test', 'demo', i % 2 === 0 ? 'even' : 'odd'],
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    author: i % 3 === 0 ? 'Alice' : i % 3 === 1 ? 'Bob' : 'Charlie',
    cover_image: i % 2 === 0 ? `/images/test-${i}.jpg` : undefined,
  },
  content: `# Test Post ${i + 1}\n\nThis is the content for test post ${i + 1}.`,
  rawMarkdown: `# Test Post ${i + 1}\n\nThis is the content for test post ${i + 1}.`,
}));

/**
 * Test 1: Render with static data (SSG mode)
 */
export function TestStaticMode() {
  const initialPosts = mockPosts.slice(0, 10);
  
  const handlePostClick = (post: ParsedPost) => {
    console.log('Post clicked:', post.filename);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>BlogList Test - Static Mode</h1>
      <p>Initial: 10 posts, Total: 25 posts, Expected: Load more on scroll</p>
      
      <BlogList
        initialPosts={initialPosts}
        allPosts={mockPosts}
        onPostClick={handlePostClick}
      />
    </div>
  );
}

/**
 * Test 2: Empty state
 */
export function TestEmptyState() {
  const handlePostClick = (post: ParsedPost) => {
    console.log('Post clicked:', post.filename);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>BlogList Test - Empty State</h1>
      <p>Expected: "No blog posts yet" message</p>
      
      <BlogList
        initialPosts={[]}
        allPosts={[]}
        onPostClick={handlePostClick}
      />
    </div>
  );
}

/**
 * Test 3: Few posts (less than page size)
 */
export function TestFewPosts() {
  const fewPosts = mockPosts.slice(0, 5);
  
  const handlePostClick = (post: ParsedPost) => {
    console.log('Post clicked:', post.filename);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>BlogList Test - Few Posts (5)</h1>
      <p>Expected: 5 posts shown, no "load more" indicator</p>
      
      <BlogList
        initialPosts={fewPosts}
        allPosts={fewPosts}
        onPostClick={handlePostClick}
      />
    </div>
  );
}

/**
 * Test 4: Exactly one page
 */
export function TestExactlyOnePage() {
  const exactlyTen = mockPosts.slice(0, 10);
  
  const handlePostClick = (post: ParsedPost) => {
    console.log('Post clicked:', post.filename);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>BlogList Test - Exactly One Page (10)</h1>
      <p>Expected: 10 posts shown, "No more posts" message</p>
      
      <BlogList
        initialPosts={exactlyTen}
        allPosts={exactlyTen}
        onPostClick={handlePostClick}
      />
    </div>
  );
}

/**
 * Test 5: Custom page size
 */
export function TestCustomPageSize() {
  const initial = mockPosts.slice(0, 5);
  
  const handlePostClick = (post: ParsedPost) => {
    console.log('Post clicked:', post.filename);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>BlogList Test - Custom Page Size (5)</h1>
      <p>Initial: 5 posts, Total: 25 posts, Page Size: 5</p>
      <p>Expected: Load 5 posts at a time on scroll</p>
      
      <BlogList
        initialPosts={initial}
        allPosts={mockPosts}
        onPostClick={handlePostClick}
        pageSize={5}
      />
    </div>
  );
}

/**
 * Test 6: Client-side mode (API fetching)
 * Note: This requires an API endpoint to be set up
 */
export function TestClientSideMode() {
  const initial = mockPosts.slice(0, 10);
  
  const handlePostClick = (post: ParsedPost) => {
    console.log('Post clicked:', post.filename);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>BlogList Test - Client-Side Mode</h1>
      <p>Expected: Fetch from /api/posts?page=N on scroll</p>
      <p><strong>Note:</strong> Requires API endpoint to be implemented</p>
      
      <BlogList
        initialPosts={initial}
        // No allPosts - will use API
        onPostClick={handlePostClick}
      />
    </div>
  );
}

// Export all tests for easy access
export const tests = {
  staticMode: TestStaticMode,
  emptyState: TestEmptyState,
  fewPosts: TestFewPosts,
  exactlyOnePage: TestExactlyOnePage,
  customPageSize: TestCustomPageSize,
  clientSideMode: TestClientSideMode,
};

export default TestStaticMode;
