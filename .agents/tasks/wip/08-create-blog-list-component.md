# Task: Create Blog List Component

## Objective
Create a component that displays blog cards in a vertical list with lazy loading.

## Prerequisites
- Task 07 completed (BlogCard component exists)
- Task 06 completed (loader service exists)
- Know state management approach from technical decisions

## Requirements
- Vertical list layout
- Display BlogCard components
- Load 10 posts initially
- Load more on scroll (batches of 10)
- Infinite scroll behavior using Intersection Observer
- Loading states (initial, loading more, error)
- **ERROR HANDLING:** Handle empty state, load failures
- **ACCESSIBILITY:** Focus management, loading announcements

## Steps
1. Create component file (location from technical decisions):
   - `components/blog/BlogList.tsx` OR `src/components/blog/BlogList.tsx`

2. Implement with Intersection Observer:
   ```typescript
   import { useState, useEffect, useRef } from 'react';
   import { BlogCard } from './BlogCard';
   import type { ParsedPost } from '[lib|utils]/blog/parser';
   
   interface BlogListProps {
     initialPosts: ParsedPost[];  // For SSG/SSR initial data
     allPosts?: ParsedPost[];     // For client-side pagination
     onPostClick: (post: ParsedPost) => void;
   }
   
   export function BlogList({ initialPosts, allPosts, onPostClick }: BlogListProps) {
     const [posts, setPosts] = useState<ParsedPost[]>(initialPosts);
     const [page, setPage] = useState(1); // Already loaded page 0
     const [hasMore, setHasMore] = useState(true);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     
     const loadMoreRef = useRef<HTMLDivElement>(null);
     
     // Infinite scroll with Intersection Observer
     useEffect(() => {
       if (!loadMoreRef.current || !hasMore) return;
       
       const observer = new IntersectionObserver(
         (entries) => {
           if (entries[0].isIntersecting && !loading) {
             loadMorePosts();
           }
         },
         { threshold: 0.1 }
       );
       
       observer.observe(loadMoreRef.current);
       
       return () => observer.disconnect();
     }, [hasMore, loading, page]);
     
     const loadMorePosts = async () => {
       if (loading || !hasMore) return;
       
       setLoading(true);
       setError(null);
       
       try {
         // For SSG: slice from allPosts
         if (allPosts) {
           const pageSize = 10;
           const start = page * pageSize;
           const newPosts = allPosts.slice(start, start + pageSize);
           
           if (newPosts.length === 0) {
             setHasMore(false);
           } else {
             setPosts(prev => [...prev, ...newPosts]);
             setPage(prev => prev + 1);
             setHasMore(start + newPosts.length < allPosts.length);
           }
         }
         // For CSR: fetch from API
         else {
           const response = await fetch(`/api/posts?page=${page}`);
           if (!response.ok) throw new Error('Failed to load posts');
           
           const data = await response.json();
           setPosts(prev => [...prev, ...data.posts]);
           setPage(prev => prev + 1);
           setHasMore(data.hasMore);
         }
       } catch (err) {
         console.error('Error loading more posts:', err);
         setError('Failed to load more posts. Please try again.');
       } finally {
         setLoading(false);
       }
     };
     
     // Empty state
     if (posts.length === 0 && !loading) {
       return (
         <div className="text-center py-12" role="status">
           <p className="text-lg text-gray-500">No blog posts yet.</p>
         </div>
       );
     }
     
     return (
       <div className="blog-list">
         {/* Accessibility: Live region for loading announcements */}
         <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
           {loading && 'Loading more posts'}
           {error && error}
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {posts.map((post) => (
             <BlogCard
               key={post.filename}
               post={post}
               onClick={() => onPostClick(post)}
             />
           ))}
         </div>
         
         {/* Loading trigger element */}
         {hasMore && (
           <div ref={loadMoreRef} className="text-center py-8">
             {loading ? (
               <div className="flex justify-center items-center gap-2">
                 <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                 <span>Loading more posts...</span>
               </div>
             ) : (
               <span className="text-gray-500">Scroll for more</span>
             )}
           </div>
         )}
         
         {!hasMore && posts.length > 0 && (
           <div className="text-center py-8 text-gray-500">
             No more posts
           </div>
         )}
         
         {error && (
           <div className="text-center py-4 text-red-600" role="alert">
             {error}
           </div>
         )}
       </div>
     );
   }
   ```

3. Add loading spinner component (if not exists):
   ```tsx
   function LoadingSpinner() {
     return (
       <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full" />
     );
   }
   ```

4. Handle edge cases:
   - 0-5 posts (less than page size): No "load more" needed
   - Exactly 10 posts: Show "load more" but then "no more"
   - Network errors: Show retry option
   - Slow connections: Show loading state

## Success Criteria
- [ ] Component file created in correct location
- [ ] Initial 10 posts display on mount
- [ ] More posts load when scrolling to bottom
- [ ] Uses Intersection Observer (modern, performant approach)
- [ ] Loading states display correctly (initial, loading more)
- [ ] **ERROR HANDLING:** Empty state displays when no posts
- [ ] **ERROR HANDLING:** Error message shows on load failure
- [ ] **ACCESSIBILITY:** Loading announcements for screen readers
- [ ] **ACCESSIBILITY:** Focus management maintained
- [ ] No duplicate posts loaded
- [ ] Stops loading when no more posts
- [ ] Smooth scroll experience (no jank)
- [ ] Works with 0-5 posts (less than initial batch)
- [ ] Works with exactly 10 posts
- [ ] Grid/list layout responsive (1/2/3 columns based on screen size)
- [ ] Integrates with BlogCard component correctly

## Example Structure
```
<BlogList>
  <BlogCard ... />
  <BlogCard ... />
  ...
  <LoadingIndicator />
</BlogList>
```
