# Task: Add shared tag filter UI component

**Scope (single file):** `components/TagFilterBar.tsx` (new)

## Goal
Create a small, tasteful, accessible tag filter UI (Joy UI) that can be reused on both Blog and Lore listing pages.

## Steps
1. Add `components/TagFilterBar.tsx` exporting a controlled component, e.g.:
   - Props: `allTags: string[]`, `selectedTags: string[]`, `onChange(nextSelected: string[])`.
   - Render a subtle “Filter” row (label + chip group).
   - Include an “All”/“Clear” affordance.
   - Support multi-select toggling (clicking a tag adds/removes it).
   - Hide the entire bar when `allTags.length === 0`.
2. Keep styling consistent with existing Joy UI (soft/outlined chips, wraps on small screens).
3. Commit the change.

## Acceptance Criteria
- Component renders without layout jank and wraps nicely on mobile widths.
- Keyboard access works (chips focusable; activation via Enter/Space).
- No new deps added.

## Quick Verification
- `bun run build` (ensures TS + Next compile passes).

## Commit
- `git status`
- `git add components/TagFilterBar.tsx`
- `git commit -m "ui: add TagFilterBar component"`

