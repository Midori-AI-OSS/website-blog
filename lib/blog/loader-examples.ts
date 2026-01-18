/**
 * Example usage of the Post Loader in Next.js
 * 
 * This file demonstrates how to use the loader in different scenarios:
 * - SSG (Static Site Generation) at build time
 * - SSR (Server-Side Rendering) with caching
 * - API Routes
 */

import { loadAllPosts, loadAllPostsCached, paginatePosts, getPostBySlug } from './loader';

// ============================================================================
// EXAMPLE 1: SSG - Generate static pages at build time (Recommended)
// ============================================================================

/**
 * Next.js App Router: Generate static params for all posts
 * File: app/blog/[slug]/page.tsx
 */
export async function generateStaticParams() {
  const posts = await loadAllPosts();
  
  return posts.map((post) => ({
    slug: post.filename.replace('.md', ''),
  }));
}

/**
 * Next.js App Router: Get post data at build time
 * File: app/blog/[slug]/page.tsx
 */
export async function getPostData(slug: string) {
  const posts = await loadAllPosts();
  const post = getPostBySlug(posts, slug);
  
  if (!post) {
    return null;
  }
  
  return post;
}

/**
 * Next.js App Router: Blog list page with pagination
 * File: app/blog/page.tsx
 */
export async function getBlogPageData(page: number = 0) {
  const posts = await loadAllPosts();
  const paginated = paginatePosts(posts, page, 10);
  
  return {
    posts: paginated.posts,
    hasMore: paginated.hasMore,
    totalCount: paginated.totalCount,
    currentPage: paginated.currentPage,
    totalPages: paginated.totalPages,
  };
}

// ============================================================================
// EXAMPLE 2: SSR - Server-side rendering with caching
// ============================================================================

/**
 * Server Component with caching
 * File: app/blog/recent/page.tsx
 */
export async function getRecentPostsSSR() {
  // Use cached version for SSR to improve performance
  const posts = await loadAllPostsCached();
  
  return posts.slice(0, 5);
}

// ============================================================================
// EXAMPLE 3: API Routes
// ============================================================================

/**
 * API Route: Get paginated posts
 * File: app/api/posts/route.ts (Next.js 13+ App Router)
 */
export async function GET_Posts_API(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    
    // Use cached version for API
    const posts = await loadAllPostsCached();
    const result = paginatePosts(posts, page, pageSize);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error in posts API:', error);
    return new Response(JSON.stringify({ error: 'Failed to load posts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * API Route: Get single post by slug
 * File: app/api/posts/[slug]/route.ts (Next.js 13+ App Router)
 */
export async function GET_Post_By_Slug_API(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const posts = await loadAllPostsCached();
    const post = getPostBySlug(posts, params.slug);
    
    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(post), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error in post API:', error);
    return new Response(JSON.stringify({ error: 'Failed to load post' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================================================
// EXAMPLE 4: Complete Next.js Page Examples
// ============================================================================

/**
 * Complete Blog List Page
 * File: app/blog/page.tsx
 */
/*
import { loadAllPosts, paginatePosts } from '@/lib/blog/loader';
import Link from 'next/link';

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams.page || '0', 10);
  const posts = await loadAllPosts();
  const paginated = paginatePosts(posts, page, 10);

  return (
    <div>
      <h1>Blog Posts</h1>
      
      <div className="posts-grid">
        {paginated.posts.map((post) => (
          <article key={post.filename}>
            <Link href={`/blog/${post.filename.replace('.md', '')}`}>
              <h2>{post.metadata.title}</h2>
              {post.metadata.summary && <p>{post.metadata.summary}</p>}
            </Link>
            
            {post.metadata.tags && post.metadata.tags.length > 0 && (
              <div className="tags">
                {post.metadata.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>

      {paginated.hasMore && (
        <Link href={`/blog?page=${page + 1}`}>Load More</Link>
      )}
    </div>
  );
}
*/

/**
 * Complete Blog Post Page
 * File: app/blog/[slug]/page.tsx
 */
/*
import { loadAllPosts, getPostBySlug } from '@/lib/blog/loader';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export async function generateStaticParams() {
  const posts = await loadAllPosts();
  return posts.map((post) => ({
    slug: post.filename.replace('.md', ''),
  }));
}

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const posts = await loadAllPosts();
  const post = getPostBySlug(posts, params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article>
      <header>
        <h1>{post.metadata.title}</h1>
        {post.metadata.author && <p>By {post.metadata.author}</p>}
        {post.metadata.date && <time>{post.metadata.date}</time>}
      </header>

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {post.content}
      </ReactMarkdown>
    </article>
  );
}
*/

// ============================================================================
// EXAMPLE 5: Custom Filtering Examples
// ============================================================================

/**
 * Get posts by date range
 */
export function getPostsByDateRange(
  posts: Array<{ filename: string }>,
  startDate: Date,
  endDate: Date
) {
  return posts.filter((post) => {
    const match = post.filename.match(/^(\d{4})-(\d{2})-(\d{2})\.md$/);
    if (!match || !match[1] || !match[2] || !match[3]) return false;
    
    const [, year, month, day] = match;
    const postDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    
    return postDate >= startDate && postDate <= endDate;
  });
}

/**
 * Search posts by keyword in title or content
 */
export function searchPosts(
  posts: Array<{ metadata: { title: string }; content: string }>,
  keyword: string
) {
  const lowerKeyword = keyword.toLowerCase();
  
  return posts.filter((post) => {
    const inTitle = post.metadata.title.toLowerCase().includes(lowerKeyword);
    const inContent = post.content.toLowerCase().includes(lowerKeyword);
    
    return inTitle || inContent;
  });
}
