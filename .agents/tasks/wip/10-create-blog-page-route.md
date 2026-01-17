# Task: Create Blog Page Route

## Objective
Set up routing for the blog page and integrate all components.

## Prerequisites
- **REQUIRED:** Framework and routing approach decided in `00-TECHNICAL-DECISIONS.md`
- Tasks 07-09 completed (all components exist)
- Task 06 completed (loader service exists)

## Requirements
- Main blog route: `/blog`
- Individual post route or modal view (based on technical decisions)
- State management for view switching
- URL updates on navigation
- Browser back/forward support

## Steps

### Implementation depends on framework choice from technical decisions:

---

### Option A: Next.js App Router (Recommended)

1. Create blog list page:
   ```tsx
   // app/blog/page.tsx
   import { loadAllPosts, paginatePosts } from '@/lib/blog/loader';
   import { BlogList } from '@/components/blog/BlogList';
   
   export default async function BlogPage() {
     const allPosts = await loadAllPosts();
     const { posts: initialPosts } = paginatePosts(allPosts, 0, 10);
     
     return (
       <div className="container mx-auto">
         <h1 className="text-4xl font-bold mb-8">Blog</h1>
         <BlogList
           initialPosts={initialPosts}
           allPosts={allPosts}
           onPostClick={(post) => {
             // Client-side navigation
             window.location.href = `/blog/${post.filename.replace('.md', '')}`;
           }}
         />
       </div>
     );
   }
   ```

2. Create individual post page:
   ```tsx
   // app/blog/[slug]/page.tsx
   import { loadAllPosts, getPostBySlug } from '@/lib/blog/loader';
   import { PostView } from '@/components/blog/PostView';
   import { notFound } from 'next/navigation';
   
   export async function generateStaticParams() {
     const posts = await loadAllPosts();
     return posts.map(post => ({
       slug: post.filename.replace('.md', '')
     }));
   }
   
   export default async function PostPage({ params }: { params: { slug: string } }) {
     const allPosts = await loadAllPosts();
     const post = getPostBySlug(allPosts, params.slug);
     
     if (!post) notFound();
     
     return (
       <PostView
         post={post}
         onClose={() => {
           window.history.back();
         }}
       />
     );
   }
   ```

---

### Option B: Next.js Pages Router

1. Create blog list page:
   ```tsx
   // pages/blog/index.tsx
   import { loadAllPosts, paginatePosts } from '@/lib/blog/loader';
   import { BlogList } from '@/components/blog/BlogList';
   import type { GetStaticProps } from 'next';
   
   export const getStaticProps: GetStaticProps = async () => {
     const allPosts = await loadAllPosts();
     const { posts: initialPosts } = paginatePosts(allPosts, 0, 10);
     
     return {
       props: {
         initialPosts: JSON.parse(JSON.stringify(initialPosts)),
         allPosts: JSON.parse(JSON.stringify(allPosts)),
       },
     };
   };
   
   export default function BlogPage({ initialPosts, allPosts }) {
     const router = useRouter();
     
     return (
       <div className="container mx-auto">
         <h1 className="text-4xl font-bold mb-8">Blog</h1>
         <BlogList
           initialPosts={initialPosts}
           allPosts={allPosts}
           onPostClick={(post) => {
             router.push(`/blog/${post.filename.replace('.md', '')}`);
           }}
         />
       </div>
     );
   }
   ```

2. Create individual post page:
   ```tsx
   // pages/blog/[slug].tsx
   import { GetStaticPaths, GetStaticProps } from 'next';
   import { loadAllPosts, getPostBySlug } from '@/lib/blog/loader';
   import { PostView } from '@/components/blog/PostView';
   import { useRouter } from 'next/router';
   
   export const getStaticPaths: GetStaticPaths = async () => {
     const posts = await loadAllPosts();
     return {
       paths: posts.map(p => ({ params: { slug: p.filename.replace('.md', '') } })),
       fallback: false,
     };
   };
   
   export const getStaticProps: GetStaticProps = async ({ params }) => {
     const allPosts = await loadAllPosts();
     const post = getPostBySlug(allPosts, params!.slug as string);
     
     if (!post) return { notFound: true };
     
     return {
       props: { post: JSON.parse(JSON.stringify(post)) },
     };
   };
   
   export default function PostPage({ post }) {
     const router = useRouter();
     
     return (
       <PostView
         post={post}
         onClose={() => router.push('/blog')}
       />
     );
   }
   ```

---

### Option C: Vite + React Router

1. Set up routes:
   ```tsx
   // src/main.tsx or App.tsx
   import { createBrowserRouter, RouterProvider } from 'react-router-dom';
   import BlogPage from './pages/BlogPage';
   import PostPage from './pages/PostPage';
   
   const router = createBrowserRouter([
     {
       path: '/blog',
       element: <BlogPage />,
     },
     {
       path: '/blog/:slug',
       element: <PostPage />,
     },
   ]);
   
   function App() {
     return <RouterProvider router={router} />;
   }
   ```

2. Create blog page with client-side loading:
   ```tsx
   // src/pages/BlogPage.tsx
   import { useState, useEffect } from 'react';
   import { useNavigate } from 'react-router-dom';
   import { BlogList } from '@/components/blog/BlogList';
   
   export default function BlogPage() {
     const [initialPosts, setInitialPosts] = useState([]);
     const navigate = useNavigate();
     
     useEffect(() => {
       fetch('/api/posts?page=0')
         .then(r => r.json())
         .then(data => setInitialPosts(data.posts));
     }, []);
     
     return (
       <div className="container mx-auto">
         <h1 className="text-4xl font-bold mb-8">Blog</h1>
         <BlogList
           initialPosts={initialPosts}
           onPostClick={(post) => {
             navigate(`/blog/${post.filename.replace('.md', '')}`);
           }}
         />
       </div>
     );
   }
   ```

---

### 3. Add blog link to navigation

Add to main navigation (location varies by framework):
```tsx
<nav>
  <a href="/">Home</a>
  <a href="/blog">Blog</a>
  {/* other links */}
</nav>
```

### 4. Test navigation

```bash
# Start dev server
bun run dev

# Test:
# - Navigate to /blog
# - Click a post card -> should go to /blog/2026-01-17
# - Click back -> should return to /blog
# - Browser back button works
# - Direct URL access works
```

## Success Criteria
- [ ] Blog page accessible at `/blog`
- [ ] Can navigate to blog from main app navigation
- [ ] Clicking card navigates to individual post
- [ ] Post displayed at `/blog/[date]` URL
- [ ] Back button returns to list (or browser back works)
- [ ] URL updates appropriately on navigation
- [ ] Browser back/forward buttons work correctly
- [ ] Direct URL access works (e.g., typing `/blog/2026-01-17` in browser)
- [ ] All components integrated correctly
- [ ] Data flows from loader -> BlogList -> BlogCard
- [ ] Post data flows to PostView correctly
- [ ] Implementation matches framework choice from technical decisions
- [ ] SSG/SSR configured correctly (if applicable)

## Example Routes
```
/blog              -> BlogList (10 posts initially)
/blog/2026-01-17   -> PostView for that date
/blog/2026-01-15   -> PostView for that date
```

**Note:** Implementation details above are framework-specific. Choose the section that matches your framework choice from `00-TECHNICAL-DECISIONS.md`.
