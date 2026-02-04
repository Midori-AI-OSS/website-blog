# Task: Lore listing newest-first ordering

**Scope (single file):** `lib/lore/loader.ts`

## Goal
Ensure Lore posts are returned in **newest → oldest** order so `/lore` and the homepage “Recent Updates (Lore)” show the latest entries first.

## Steps
1. In `loadAllLorePosts()`, sort the parsed posts by date descending.
   - Prefer `post.metadata.date` (expected `YYYY-MM-DD`).
   - Keep the existing “stable date” fallback (mtime) for posts missing `metadata.date`.
   - If a date is missing/invalid, sort it last (don’t crash).
2. Keep pagination behavior unchanged (it should paginate the already-sorted list).
3. Commit the change.

## Acceptance Criteria
- `/lore` shows Lore posts newest-first by displayed date.
- Homepage “Recent Updates (Lore)” shows the same newest-first order.
- No hydration warnings introduced (date remains stable across SSR/CSR).

## Quick Verification
- `bun run dev` then open `http://localhost:3000/lore` and confirm ordering.
- `bun run dev` then open `http://localhost:3000/` and confirm the Lore section ordering.
- Optional: `bun run build` to confirm no TypeScript/build issues.

## Commit
- `git status`
- `git add lib/lore/loader.ts`
- `git commit -m "lore: sort posts newest first"`

