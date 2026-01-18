/**
 * PostView Component Example
 * 
 * Demonstrates usage of the PostView component with sample data.
 * This example shows how to integrate PostView in a blog page.
 */

import React, { useState } from 'react';
import { CssVarsProvider } from '@mui/joy/styles';
import { Box } from '@mui/joy';
import { PostView } from './PostView';
import { BlogList } from './BlogList';
import type { ParsedPost } from '../../lib/blog/parser';

/**
 * Example post data
 */
const examplePost: ParsedPost = {
  filename: '2025-01-17.md',
  metadata: {
    title: 'Getting Started with SvelteKit Blog Template',
    summary: 'Learn how to set up and use this modern blog template built with Next.js, MUI Joy, and TypeScript.',
    tags: ['nextjs', 'typescript', 'blog', 'tutorial'],
    cover_image: 'https://via.placeholder.com/1200x600/667eea/ffffff?text=Blog+Cover',
    author: 'Midori AI Team',
  },
  content: `# Introduction

Welcome to the **SvelteKit Blog Template**! This is a modern, performant, and accessible blog system built with cutting-edge technologies.

## Features

This template includes several powerful features:

1. **Fast Performance**: Built on Next.js 15 with Static Site Generation (SSG)
2. **Beautiful UI**: Styled with MUI Joy components
3. **Type Safety**: Full TypeScript support with strict mode
4. **Secure**: Markdown sanitization with rehype-sanitize
5. **Accessible**: WCAG 2.1 Level AA compliant

### Code Example

Here's how easy it is to add a new blog post:

\`\`\`markdown
+++
title: My New Post
summary: A brief description
tags: [example, tutorial]
+++

# Your content here
\`\`\`

## Getting Started

To get started with this template:

- Install dependencies: \`bun install\`
- Start dev server: \`bun run dev\`
- Create posts in \`blog/posts/\` directory
- Follow the \`YYYY-MM-DD.md\` naming convention

> **Note:** All markdown content is automatically sanitized for security.

## Advanced Features

You can also:

* Add cover images to your posts
* Use GitHub Flavored Markdown (GFM)
* Organize posts with tags
* Include code blocks with syntax highlighting

Check out the [documentation](#) for more details!

---

Happy blogging! 🚀`,
  rawMarkdown: '...',
};

/**
 * Example posts for the list view
 */
const examplePosts: ParsedPost[] = [
  examplePost,
  {
    filename: '2025-01-16.md',
    metadata: {
      title: 'Second Blog Post',
      summary: 'Another example post',
      tags: ['example'],
    },
    content: '# Second Post\n\nThis is the second post.',
    rawMarkdown: '...',
  },
];

/**
 * Example component demonstrating PostView integration
 */
export function PostViewExample() {
  const [selectedPost, setSelectedPost] = useState<ParsedPost | null>(null);

  return (
    <CssVarsProvider>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.body' }}>
        {selectedPost ? (
          // Show full post view
          <PostView
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
          />
        ) : (
          // Show blog list
          <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
            <BlogList
              initialPosts={examplePosts}
              allPosts={examplePosts}
              onPostClick={(post) => setSelectedPost(post)}
            />
          </Box>
        )}
      </Box>
    </CssVarsProvider>
  );
}

export default PostViewExample;
