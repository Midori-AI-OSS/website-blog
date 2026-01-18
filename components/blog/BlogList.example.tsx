/**
 * BlogList Component Example
 * 
 * Demonstrates different usage patterns for the BlogList component:
 * 1. Static/SSG mode with all posts pre-loaded
 * 2. Client-side mode with API fetching
 * 3. Handling edge cases (empty, few posts, exactly one page)
 */

import { BlogList } from './BlogList';
import type { ParsedPost } from '../../lib/blog/parser';

// Example 1: Static/SSG Mode
// All posts are loaded at build time, pagination happens client-side
export function StaticBlogListExample() {
  // Mock data - would come from getStaticProps in Next.js
  const allPosts: ParsedPost[] = [
    {
      filename: '2024-01-15-getting-started.md',
      metadata: {
        title: 'Getting Started with Our Blog',
        summary: 'Welcome to our blog! Learn how to get started.',
        tags: ['intro', 'guide'],
        date: '2024-01-15',
        author: 'John Doe',
        cover_image: '/images/blog/getting-started.jpg',
      },
      content: '# Getting Started\n\nWelcome to our blog...',
      rawMarkdown: '# Getting Started\n\nWelcome to our blog...',
    },
    // ... more posts (imagine 25+ posts total)
  ];

  // Initial 10 posts
  const initialPosts = allPosts.slice(0, 10);

  const handlePostClick = (post: ParsedPost) => {
    // Navigate to post detail page
    console.log('Navigate to:', post.filename);
    // In Next.js: router.push(`/blog/${post.filename.replace('.md', '')}`)
  };

  return (
    <BlogList
      initialPosts={initialPosts}
      allPosts={allPosts}
      onPostClick={handlePostClick}
      pageSize={10}
    />
  );
}

// Example 2: Client-Side API Mode
// Posts are fetched from an API endpoint as user scrolls
export function ClientSideBlogListExample() {
  // Initial posts from server
  const initialPosts: ParsedPost[] = [
    // First 10 posts loaded from initial API call
  ];

  const handlePostClick = (post: ParsedPost) => {
    console.log('Navigate to:', post.filename);
  };

  return (
    <BlogList
      initialPosts={initialPosts}
      // No allPosts - will fetch from /api/posts?page=N
      onPostClick={handlePostClick}
      pageSize={10}
    />
  );
}

// Example 3: Empty State
export function EmptyBlogListExample() {
  const handlePostClick = (post: ParsedPost) => {
    console.log('Navigate to:', post.filename);
  };

  return (
    <BlogList
      initialPosts={[]}
      allPosts={[]}
      onPostClick={handlePostClick}
    />
  );
}

// Example 4: Few Posts (less than one page)
export function FewPostsExample() {
  const fewPosts: ParsedPost[] = [
    {
      filename: '2024-01-15-post-1.md',
      metadata: {
        title: 'First Post',
        summary: 'Our first blog post',
        tags: ['intro'],
      },
      content: 'Content here',
      rawMarkdown: 'Content here',
    },
    {
      filename: '2024-01-16-post-2.md',
      metadata: {
        title: 'Second Post',
        summary: 'Our second blog post',
        tags: ['update'],
      },
      content: 'More content',
      rawMarkdown: 'More content',
    },
    // Only 5 posts total - less than the default page size of 10
  ];

  const handlePostClick = (post: ParsedPost) => {
    console.log('Navigate to:', post.filename);
  };

  return (
    <BlogList
      initialPosts={fewPosts}
      allPosts={fewPosts}
      onPostClick={handlePostClick}
    />
  );
}

// Example 5: Exactly One Page
export function ExactlyOnePageExample() {
  // Generate exactly 10 posts
  const exactlyTenPosts: ParsedPost[] = Array.from({ length: 10 }, (_, i) => ({
    filename: `2024-01-${String(i + 1).padStart(2, '0')}-post-${i + 1}.md`,
    metadata: {
      title: `Post ${i + 1}`,
      summary: `Summary for post ${i + 1}`,
      tags: ['example'],
    },
    content: `Content for post ${i + 1}`,
    rawMarkdown: `Content for post ${i + 1}`,
  }));

  const handlePostClick = (post: ParsedPost) => {
    console.log('Navigate to:', post.filename);
  };

  return (
    <BlogList
      initialPosts={exactlyTenPosts}
      allPosts={exactlyTenPosts}
      onPostClick={handlePostClick}
    />
  );
}

// Example 6: Custom Page Size
export function CustomPageSizeExample() {
  const allPosts: ParsedPost[] = []; // Imagine many posts

  const handlePostClick = (post: ParsedPost) => {
    console.log('Navigate to:', post.filename);
  };

  return (
    <BlogList
      initialPosts={allPosts.slice(0, 5)}
      allPosts={allPosts}
      onPostClick={handlePostClick}
      pageSize={5} // Load 5 posts at a time instead of 10
    />
  );
}

// Example API Route Handler (for Next.js)
// This would go in pages/api/posts.ts or app/api/posts/route.ts

/**
 * Example API route for client-side pagination
 * GET /api/posts?page=0&pageSize=10
 */
export async function exampleApiHandler(req: any, res: any) {
  const page = parseInt(req.query.page || '0');
  const pageSize = parseInt(req.query.pageSize || '10');
  
  // Fetch posts from database, CMS, or file system
  const allPosts: ParsedPost[] = []; // Your posts here
  
  const start = page * pageSize;
  const posts = allPosts.slice(start, start + pageSize);
  const hasMore = start + posts.length < allPosts.length;
  
  res.status(200).json({
    posts,
    hasMore,
    total: allPosts.length,
    page,
    pageSize,
  });
}
