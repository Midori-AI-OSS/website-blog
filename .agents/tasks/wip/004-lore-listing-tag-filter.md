# Task: Add tag filtering to Lore listing page

**Scope (single file):** `app/lore/LoreListPageClient.tsx`

## Goal
Add a tag filter UI to `/lore` so users can select tags and filter the listing (including infinite scroll behavior).

## Steps
1. Import and render `TagFilterBar` above `BlogList`.
2. Derive `allTags` from `allPosts` (unique, trimmed; sort; case-insensitive uniqueness).
3. Track `selectedTags` state in the client component.
4. Compute `filteredAllPosts` from `allPosts` based on `selectedTags` (match **any** selected tag).
5. Compute `filteredInitialPosts = filteredAllPosts.slice(0, 10)` and pass both into `BlogList`.
6. Ensure `BlogList` resets when the filter changes (e.g., `key` based on selection).
7. Commit the change.

## Acceptance Criteria
- `/lore` shows a tag filter UI.
- Selecting a tag reduces the list to matching Lore posts; clearing returns all posts.
- Infinite scroll only loads within the filtered set.

## Quick Verification
- `bun run dev` then open `http://localhost:3000/lore`.
- Click tags and confirm the list updates + scroll loading respects the filter.
- Optional: `bun run build`.

## Commit
- `git status`
- `git add app/lore/LoreListPageClient.tsx`
- `git commit -m "lore: add tag filter to listing"`

