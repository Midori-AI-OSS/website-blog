# Task 02: Default 10 per page + localStorage persistence

**File:** `app/lore/LoreListPageClient.tsx`
**Status:** pending

## Summary
Change the fallback default page size from `Infinity` to `10`. Persist each game's page size choice to `localStorage` with per-game keys so choices survive page reloads.

## Detailed changes

### 1. Change fallback default (line 177)

**Current:**
```tsx
const pageSize = pageSizeByGame[group.game.slug] ?? Infinity;
```

**New:**
```tsx
const pageSize = pageSizeByGame[group.game.slug] ?? 10;
```

This makes new visitors see 10 posts per page by default.

### 2. Hydrate pageSizeByGame from localStorage on mount (new useEffect)

Add a `useEffect` after the existing `useEffect` block (after line 221), before the `if (groupsWithUiState.length === 0)` check (line 223):

```tsx
// Hydrate page sizes from localStorage on mount
useEffect(() => {
  const hydrated: Record<string, number> = {};
  for (const group of gameGroups) {
    const stored = localStorage.getItem(`lore-page-size-${group.game.slug}`);
    if (stored !== null) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed) && parsed > 0) {
        hydrated[group.game.slug] = parsed;
      }
    }
  }
  if (Object.keys(hydrated).length > 0) {
    setPageSizeByGame((current) => ({ ...current, ...hydrated }));
  }
}, [gameGroups]);
```

**Details:**
- Uses key pattern `lore-page-size-{slug}` (e.g., `lore-page-size-midori`)
- Only sets values when a stored value exists and is a valid positive finite number
- Merges into existing state so other state isn't reset

### 3. Write to localStorage on page size change (line 378-385, the onChange handler)

The page size `Select` onChange handler at lines 378-385 currently does:
```tsx
onChange={(_event, value) => {
  if (value === null) return;
  setPageSizeByGame((current) => ({
    ...current,
    [group.game.slug]: value,
  }));
  setCurrentPageByGame((current) => ({ ...current, [group.game.slug]: 1 }));
}}
```

Add a `localStorage.setItem` call before or after the state update:

```tsx
onChange={(_event, value) => {
  if (value === null) return;
  localStorage.setItem(`lore-page-size-${group.game.slug}`, String(value));
  setPageSizeByGame((current) => ({
    ...current,
    [group.game.slug]: value,
  }));
  setCurrentPageByGame((current) => ({ ...current, [group.game.slug]: 1 }));
}}
```

### 4. Edge cases
- **Corrupted localStorage value**: The hydration effect validates with `Number.isFinite(parsed) && parsed > 0` — bad values are ignored and default 10 is used
- **First visit**: No localStorage key exists → falls through to `?? 10` on line 177
- **Multiple games**: Each game's slug produces a unique key, so choices are independent
- **Infinity / All option**: If the user selects "All" (`Infinity`), `String(Infinity)` → `"Infinity"` is stored, then `Number("Infinity")` → `Infinity` which fails `Number.isFinite()` check, so on reload it falls back to 10. This is acceptable — "All" is an explicit choice that resets to 10 on reload (consistent with most paginated UIs)
