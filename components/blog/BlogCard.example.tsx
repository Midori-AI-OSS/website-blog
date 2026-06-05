/**
 * BlogCard Usage Example
 *
 * Demonstrates how to use the BlogCard component with sample data
 */

import type { ParsedPost } from '../../lib/blog/parser';
import { BlogCard } from './BlogCard';

/**
 * Example blog posts for testing
 */
const examplePosts: ParsedPost[] = [
  {
    filename: '2026-01-17.md',
    metadata: {
      title: 'Getting Started with Next.js 15',
      summary: 'Learn how to build modern web applications with the latest version of Next.js',
      tags: ['nextjs', 'react', 'typescript'],
      cover_image: 'https://via.placeholder.com/800x400',
      author: 'John Doe',
    },
    content: '# Full content here...',
    rawMarkdown: '# Full content here...',
  },
  {
    filename: '2026-01-15.md',
    metadata: {
      title: 'Understanding React Hooks',
      summary: 'A deep dive into React hooks and their use cases',
      tags: ['react', 'hooks', 'javascript'],
    },
    content: '# React hooks content...',
    rawMarkdown: '# React hooks content...',
  },
  {
    filename: '2026-01-10.md',
    metadata: {
      title: 'Blog Post Without Metadata',
      tags: [],
    },
    content: '# Minimal post...',
    rawMarkdown: '# Minimal post...',
  },
];

/**
 * Example component showing BlogCard usage
 */
export function BlogCardExample() {
  const handlePostClick = (post: ParsedPost) => {
    console.log('Post clicked:', post.metadata.title);
    // In real app: navigate to /blog/[slug]
  };

  const firstPost = examplePosts[0];
  const secondPost = examplePosts[1];
  const thirdPost = examplePosts[2];

  if (!firstPost || !secondPost || !thirdPost) {
    return null;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1>Blog Posts</h1>

      {/* Example 1: Card with href (recommended for proper linking) */}
      <BlogCard
        post={firstPost}
        href="/blog/2026-01-17"
        onClick={() => handlePostClick(firstPost)}
      />

      {/* Example 2: Card with variant and href */}
      <BlogCard
        post={secondPost}
        href="/blog/2026-01-15"
        onClick={() => handlePostClick(secondPost)}
        variant="outlined"
      />

      {/* Example 3: Card with onClick only (legacy mode) */}
      <BlogCard
        post={thirdPost}
        onClick={() => handlePostClick(thirdPost)}
        color="primary"
        variant="soft"
      />
    </div>
  );
}

/**
 * Example usage in a list
 */
export function BlogCardList() {
  const handlePostClick = (post: ParsedPost) => {
    console.log('Opening post:', post.metadata.title);
    // Navigate to full post view
  };

  const getPostHref = (post: ParsedPost) => {
    const slug = post.filename.replace('.md', '');
    return `/blog/${slug}`;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      {examplePosts.map((post) => (
        <BlogCard
          key={post.filename}
          post={post}
          href={getPostHref(post)}
          onClick={() => handlePostClick(post)}
        />
      ))}
    </div>
  );
}
