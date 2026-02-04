# Task: Add tag filtering to Blog listing page

**Scope (single file):** `app/blog/BlogPageClient.tsx`

## Goal
Add a tag filter UI to `/blog` so users can select tags and filter the listing (including infinite scroll behavior).

## Steps
1. Import and render `TagFilterBar` above `BlogList`.
2. Derive `allTags` from `allPosts` (unique, trimmed; sort alphabetically; case-insensitive uniqueness).
3. Track `selectedTags` state in the client component.
4. Compute `filteredAllPosts` from `allPosts` based on `selectedTags`:
   - Recommend: show posts that match **any** selected tag.
5. Compute `filteredInitialPosts = filteredAllPosts.slice(0, 10)` and pass both into `BlogList`.
6. Ensure `BlogList` resets when the filter changes (e.g., pass a `key` based on `selectedTags.join(",")` so it remounts).
7. Commit the change.

## Acceptance Criteria
- `/blog` shows a tag filter UI.
- Selecting a tag reduces the list to matching posts; clearing returns all posts.
- Infinite scroll only loads within the filtered set (no “leaking” unfiltered posts).

## Quick Verification
- `bun run dev` then open `http://localhost:3000/blog`.
- Click 1–2 tags and confirm the list updates + scroll loading respects the filter.
- Optional: `bun run build`.

## Commit
- `git status`
- `git add app/blog/BlogPageClient.tsx`
- `git commit -m "blog: add tag filter to listing"`

