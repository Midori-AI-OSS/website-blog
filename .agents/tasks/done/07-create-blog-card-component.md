# Task: Create Blog Card Component

## Objective
Create a reusable blog card component that displays post preview information.

## Prerequisites
- Task 05 completed (parser types available)
- Know styling approach from technical decisions
- Know TypeScript/JavaScript choice

## Requirements
- Display: title, date, summary (if present), cover image (if present)
- Clickable to open full post view
- Follow Big-AGI card layout style (from task 02 analysis)
- Use styling approach from technical decisions
- Use existing project UI components where possible
- Responsive design
- **ACCESSIBILITY:** Keyboard navigable, ARIA labels
- **SECURITY:** Display sanitized content only

## Steps
1. Create component file (location from technical decisions):
   - `components/blog/BlogCard.tsx` OR `src/components/blog/BlogCard.tsx`

2. Design card structure:
   ```typescript
   import type { ParsedPost } from '[lib|utils]/blog/parser';
   
   interface BlogCardProps {
     post: ParsedPost;
     onClick: () => void;
   }
   
   export function BlogCard({ post, onClick }: BlogCardProps) {
     // Implementation
   }
   ```

3. Implement card layout (adapt based on styling approach):
   
   **Example with Tailwind CSS:**
   ```tsx
   export function BlogCard({ post, onClick }: BlogCardProps) {
     const date = new Date(post.filename.replace('.md', ''));
     
     return (
       <article
         className="blog-card rounded-lg border p-4 cursor-pointer hover:shadow-lg transition-shadow"
         onClick={onClick}
         onKeyDown={(e) => e.key === 'Enter' && onClick()}
         tabIndex={0}
         role="button"
         aria-label={`Read post: ${post.metadata.title}`}
       >
         {post.metadata.cover_image && (
           <img
             src={post.metadata.cover_image}
             alt={post.metadata.title}
             className="w-full h-48 object-cover rounded-t-lg mb-4"
             loading="lazy"
           />
         )}
         
         <h3 className="text-xl font-bold mb-2">
           {post.metadata.title}
         </h3>
         
         <time
           className="text-sm text-gray-500 mb-2 block"
           dateTime={date.toISOString()}
         >
           {date.toLocaleDateString('en-US', {
             year: 'numeric',
             month: 'long',
             day: 'numeric'
           })}
         </time>
         
         {post.metadata.summary && (
           <p className="text-gray-700 mb-4">
             {post.metadata.summary}
           </p>
         )}
         
         {post.metadata.tags && post.metadata.tags.length > 0 && (
           <div className="flex gap-2 flex-wrap">
             {post.metadata.tags.map(tag => (
               <span
                 key={tag}
                 className="text-xs bg-gray-200 px-2 py-1 rounded"
               >
                 {tag}
               </span>
             ))}
           </div>
         )}
       </article>
     );
   }
   ```
   
   **Example with CSS Modules:**
   ```tsx
   import styles from './BlogCard.module.css';
   
   export function BlogCard({ post, onClick }: BlogCardProps) {
     // Similar structure with className={styles.card} etc.
   }
   ```

4. Create styles file (if using CSS Modules):
   ```css
   /* BlogCard.module.css */
   .card {
     border-radius: 8px;
     border: 1px solid var(--border-color);
     padding: 1rem;
     cursor: pointer;
     transition: box-shadow 0.2s;
   }
   
   .card:hover {
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
   }
   
   /* Add more styles based on Big-AGI patterns from task 02 */
   ```

5. Add accessibility features:
   - Keyboard navigation (Enter key)
   - Focus styles
   - ARIA labels
   - Semantic HTML (article, time, etc.)

6. Test responsiveness:
   - Mobile: Full width, stack elements
   - Tablet: 2-3 columns
   - Desktop: 3-4 columns

## Success Criteria
- [x] Component file created in correct location
- [x] Card displays all required information (title, date, summary, cover image)
- [x] Handles missing summary gracefully
- [x] Handles missing cover image gracefully
- [x] Clickable with proper hover state
- [x] **ACCESSIBILITY:** Keyboard navigable (Enter key works)
- [x] **ACCESSIBILITY:** Focus styles visible
- [x] **ACCESSIBILITY:** ARIA labels present
- [x] **ACCESSIBILITY:** Semantic HTML used
- [x] Styling matches Big-AGI reference patterns (from task 02)
- [x] Uses styling approach from technical decisions
- [x] Responsive on mobile/tablet/desktop
- [x] Cover images lazy-load for performance
- [x] Date formatted correctly
- [x] Tags display properly (if present)

## Reference
- Big-AGI: news screen card layout
- Agents-Runner: color scheme and styling

---

## ✅ Completion Notes

**Date:** 2026-01-18  
**Status:** Complete

### Implementation Summary

Created `BlogCard.tsx` component at `components/blog/BlogCard.tsx` with the following features:

1. **Core Features:**
   - Displays post title, date, summary, cover image, author, and tags
   - Gracefully handles missing metadata (all fields optional except title)
   - Clickable card with hover effects (shadow elevation on hover)
   - Full keyboard navigation support (Enter/Space keys)

2. **Accessibility (WCAG 2.1 Level AA):**
   - Semantic HTML (`<article>`, `<time>`, `<h3>`)
   - ARIA labels: `aria-label="Read blog post: {title}"`
   - Keyboard focus: 2px solid outline with offset
   - Tab navigation: `tabIndex={0}`
   - Screen reader friendly

3. **Styling (MUI Joy):**
   - Follows Big-AGI card patterns (Card + CardContent + CardOverflow)
   - Cover image with 2:1 aspect ratio
   - Typography levels: `title-lg` for title, `body-sm` for metadata
   - Spacing: `mb: 3` (24px), `gap: 1` (8px)
   - Hover state: `boxShadow: 'md'`
   - Focus state: Primary color outline

4. **Performance:**
   - Lazy loading for cover images (`loading="lazy"`)
   - Minimal re-renders with React best practices
   - Type-safe with TypeScript strict mode

5. **Date Handling:**
   - Extracts from filename (YYYY-MM-DD.md)
   - Falls back to metadata.date
   - Formats as "Month DD, YYYY"
   - Uses semantic `<time>` element with `dateTime` attribute

6. **Additional Files:**
   - `BlogCard.example.tsx` - Usage examples and demos
   - `README.md` - Complete documentation

### Type Safety

- Fixed TypeScript errors with optional chaining (`match?.[1]`)
- Strict null checks for optional metadata fields
- Full type definitions for props interface

### Testing

- Verified no TypeScript errors in project build
- Example file demonstrates multiple use cases
- Tested with different metadata combinations

### Next Steps

This component is ready for integration in:
- **Task 08:** BlogList component (uses BlogCard in a list)
- **Task 09:** Full post view (navigate from BlogCard click)

### Files Created

- `components/blog/BlogCard.tsx` (main component)
- `components/blog/BlogCard.example.tsx` (usage examples)
- `components/blog/README.md` (documentation)
