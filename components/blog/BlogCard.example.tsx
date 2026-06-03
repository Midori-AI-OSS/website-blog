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
 * Get example post from array with default handling
 */
const getExamplePost = (index: number): ParsedPost => {
  const post = examplePosts[index];
  return (
    post ??
    ({
      filename: '',
      metadata: {},
      content: '',
      rawMarkdown: '',
    } as ParsedPost)
  );
};

/**
 * Example component showing BlogCard usage
 */
export function BlogCardExample() {
  const handlePostClick = (post: ParsedPost) => {
    console.log('Post clicked:', post.metadata.title);
    // In real app: navigate to /blog/[slug]
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1>Blog Posts</h1>

      {/* Example 1: Card with href (recommended for proper linking) */}
      <BlogCard
        post={getExamplePost(0)}
        href="/blog/2026-01-17"
        onClick={() => handlePostClick(getExamplePost(0))}
      />

      {/* Example 2: Card with variant and href */}
      <BlogCard
        post={getExamplePost(1)}
        href="/blog/2026-01-15"
        onClick={() => handlePostClick(getExamplePost(1))}
        variant="outlined"
      />

      {/* Example 3: Card with onClick only (legacy mode) */}
      <BlogCard
        post={getExamplePost(2)}
        onClick={() => handlePostClick(getExamplePost(2))}
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
