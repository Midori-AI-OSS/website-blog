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
- [ ] Component file created in correct location
- [ ] Card displays all required information (title, date, summary, cover image)
- [ ] Handles missing summary gracefully
- [ ] Handles missing cover image gracefully
- [ ] Clickable with proper hover state
- [ ] **ACCESSIBILITY:** Keyboard navigable (Enter key works)
- [ ] **ACCESSIBILITY:** Focus styles visible
- [ ] **ACCESSIBILITY:** ARIA labels present
- [ ] **ACCESSIBILITY:** Semantic HTML used
- [ ] Styling matches Big-AGI reference patterns (from task 02)
- [ ] Uses styling approach from technical decisions
- [ ] Responsive on mobile/tablet/desktop
- [ ] Cover images lazy-load for performance
- [ ] Date formatted correctly
- [ ] Tags display properly (if present)

## Reference
- Big-AGI: news screen card layout
- Agents-Runner: color scheme and styling
