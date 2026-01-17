# Task: Create Post View Component

## Objective
Create a full post view that displays the complete rendered markdown content.

## Prerequisites
- Task 05 completed (parser provides sanitized HTML)
- Know styling approach from technical decisions

## Requirements
- Display post title, date, tags, cover image
- Render full markdown content (pre-sanitized by parser)
- Back/close button to return to list
- Proper markdown styling (headings, lists, code, links, images)
- **SECURITY:** Content already sanitized by parser (verify)
- **ACCESSIBILITY:** Semantic HTML, proper heading hierarchy
- Responsive design with readable typography

## Steps
1. Create component file (location from technical decisions):
   - `components/blog/PostView.tsx` OR `src/components/blog/PostView.tsx`

2. Implement component:
   ```typescript
   import type { ParsedPost } from '[lib|utils]/blog/parser';
   
   interface PostViewProps {
     post: ParsedPost;
     onClose: () => void;
   }
   
   export function PostView({ post, onClose }: PostViewProps) {
     const date = new Date(post.filename.replace('.md', ''));
     
     return (
       <article className="post-view max-w-4xl mx-auto px-4 py-8">
         {/* Header */}
         <header className="mb-8">
           <button
             onClick={onClose}
             className="mb-4 text-blue-600 hover:underline flex items-center gap-2"
             aria-label="Back to blog list"
           >
             <span aria-hidden="true">←</span> Back to posts
           </button>
           
           <h1 className="text-4xl font-bold mb-4">
             {post.metadata.title}
           </h1>
           
           <div className="flex flex-wrap items-center gap-4 text-gray-600">
             <time dateTime={date.toISOString()}>
               {date.toLocaleDateString('en-US', {
                 year: 'numeric',
                 month: 'long',
                 day: 'numeric'
               })}
             </time>
             
             {post.metadata.tags && post.metadata.tags.length > 0 && (
               <div className="flex gap-2 flex-wrap">
                 {post.metadata.tags.map(tag => (
                   <span
                     key={tag}
                     className="text-sm bg-gray-200 px-3 py-1 rounded"
                   >
                     #{tag}
                   </span>
                 ))}
               </div>
             )}
           </div>
         </header>
         
         {/* Cover Image */}
         {post.metadata.cover_image && (
           <img
             src={post.metadata.cover_image}
             alt={post.metadata.title}
             className="w-full max-h-96 object-cover rounded-lg mb-8"
           />
         )}
         
         {/* Markdown Content - Already sanitized by parser */}
         <div
           className="prose prose-lg max-w-none"
           dangerouslySetInnerHTML={{ __html: post.content }}
         />
       </article>
     );
   }
   ```

3. Add markdown styles:
   
   **Option A: Use prose plugin (Tailwind):**
   ```bash
   bun add -d @tailwindcss/typography
   ```
   Add to tailwind.config.js:
   ```js
   plugins: [require('@tailwindcss/typography')]
   ```
   
   **Option B: Custom CSS:**
   ```css
   /* PostView.module.css or global.css */
   .prose h1 { font-size: 2.25rem; margin-top: 2rem; margin-bottom: 1rem; }
   .prose h2 { font-size: 1.875rem; margin-top: 1.75rem; margin-bottom: 0.75rem; }
   .prose h3 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
   .prose p { line-height: 1.75; margin-bottom: 1rem; }
   .prose ul, .prose ol { margin-left: 1.5rem; margin-bottom: 1rem; }
   .prose li { margin-bottom: 0.5rem; }
   .prose code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; }
   .prose pre { background: #2d2d2d; color: #f8f8f2; padding: 1rem; border-radius: 6px; overflow-x: auto; }
   .prose a { color: #0066cc; text-decoration: underline; }
   .prose img { max-width: 100%; height: auto; border-radius: 6px; }
   .prose blockquote { border-left: 4px solid #ccc; padding-left: 1rem; font-style: italic; }
   ```

4. Add syntax highlighting (optional but recommended):
   ```bash
   bun add highlight.js
   ```
   ```typescript
   import hljs from 'highlight.js';
   import 'highlight.js/styles/github-dark.css';
   
   useEffect(() => {
     document.querySelectorAll('pre code').forEach((block) => {
       hljs.highlightElement(block as HTMLElement);
     });
   }, [post]);
   ```

5. Ensure responsive images:
   ```css
   .prose img {
     max-width: 100%;
     height: auto;
   }
   ```

6. Add keyboard navigation:
   ```typescript
   useEffect(() => {
     const handleEscape = (e: KeyboardEvent) => {
       if (e.key === 'Escape') onClose();
     };
     window.addEventListener('keydown', handleEscape);
     return () => window.removeEventListener('keydown', handleEscape);
   }, [onClose]);
   ```

## Success Criteria
- [ ] Component file created in correct location
- [ ] Displays full post content with all metadata
- [ ] Markdown renders correctly (headings, lists, links, images, code)
- [ ] Back button works and is keyboard accessible
- [ ] Cover image displays properly (if present) and is responsive
- [ ] Title and date prominent and properly formatted
- [ ] Tags display correctly (if present)
- [ ] **SECURITY:** Verified that content is sanitized (check parser output)
- [ ] **ACCESSIBILITY:** Semantic HTML (article, header, time elements)
- [ ] **ACCESSIBILITY:** Proper heading hierarchy (h1 -> h2 -> h3)
- [ ] **ACCESSIBILITY:** Escape key closes view
- [ ] Readable typography (line-height, font-size)
- [ ] Content max-width for readability (~65-80 characters per line)
- [ ] Code blocks formatted with monospace font
- [ ] Syntax highlighting works (if implemented)
- [ ] Responsive design (readable on mobile, tablet, desktop)
- [ ] Images are responsive and don't overflow
- [ ] Links are styled and understandable

## Notes
- Content is already sanitized by parser (task 05) - verify this in code
- Consider markdown style library (@tailwindcss/typography) or custom CSS
- Syntax highlighting library (highlight.js or prism) optional but improves UX
- Max-width of 65-80ch recommended for optimal reading
