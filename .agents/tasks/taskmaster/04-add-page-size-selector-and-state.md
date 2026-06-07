# Task: Add Per-Game Page Size Selector and Pagination State

## Objective
Add a per-game page size dropdown to each game's controls row, along with per-game pagination state (current page and page size), reset logic, and post slicing.

## File to modify
`app/lore/LoreListPageClient.tsx`

## What to do

### 1. Add page size options constant
Add near the top of the file (near `SORT_OPTIONS`):
```ts
const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 per page' },
  { value: 20, label: '20 per page' },
  { value: 100, label: '100 per page' },
  { value: Infinity, label: 'All' },
] as const;
```

### 2. Add pagination state
Inside `LoreListPageClient`, alongside the existing `sortByGame` and `characterByGame` state, add:
```ts
const [pageSizeByGame, setPageSizeByGame] = useState<Record<string, number>>({});
const [currentPageByGame, setCurrentPageByGame] = useState<Record<string, number>>({});
```

### 3. Incorporate pagination state into `groupsWithUiState` useMemo
For each group, derive:
- `pageSize`: `pageSizeByGame[group.game.slug] ?? Infinity` (default to All, meaning no pagination)
- `currentPage`: `currentPageByGame[group.game.slug] ?? 1` (1-indexed)

After sorting and filtering, slice the posts:
```ts
const paginatedPosts = pageSize === Infinity
  ? filteredPosts
  : filteredPosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

const totalPages = pageSize === Infinity ? 1 : Math.ceil(filteredPosts.length / pageSize);
```

Return these from the useMemo alongside the existing fields:
```ts
return {
  ...group,
  sortMode,
  selectedCharacter,
  filteredPosts,   // keep for total count
  paginatedPosts,   // what actually renders
  pageSize,
  currentPage,
  totalPages,
  fullStoryHref: buildFullStoryHref(group.game.slug),
};
```

Also update the useMemo dependency array to include the new state variables so pagination recomputes correctly:
```ts
}, [characterByGame, currentPageByGame, gameGroups, pageSizeByGame, sortByGame]);
```

### 4. Reset currentPage to 1 when sort, filter, or page size changes
When setting `sortByGame`, `characterByGame`, or `pageSizeByGame`, also reset the `currentPageByGame` for that game to 1.

For `setSortByGame` (around line 259), update:
```ts
onChange={(_event, value) => {
  if (!value) return;
  setSortByGame((current) => ({ ...current, [group.game.slug]: value }));
  setCurrentPageByGame((current) => ({ ...current, [group.game.slug]: 1 }));
}}
```

For `setCharacterByGame` (around line 287), update:
```ts
onChange={(_event, value) => {
  setCharacterByGame((current) => ({ ...current, [group.game.slug]: value ?? '' }));
  setCurrentPageByGame((current) => ({ ...current, [group.game.slug]: 1 }));
}}
```

### 5. Add page size Select to controls row
In each game's controls row (the `<Stack direction={{ xs: 'column', sm: 'row' }} ...>` that contains the sort and character selects), add a third `FormControl` + `Select` for page size. Place it after the character filter select and before the "Read full story" button.

```tsx
<FormControl
  size="sm"
  sx={{ minWidth: { xs: '100%', sm: 140 }, flex: { sm: '0 0 140px' } }}
>
  <Select
    value={group.pageSize}
    onChange={(_event, value) => {
      if (value === null) return;
      setPageSizeByGame((current) => ({ ...current, [group.game.slug]: value }));
      setCurrentPageByGame((current) => ({ ...current, [group.game.slug]: 1 }));
    }}
    aria-label={`Posts per page for ${group.game.title}`}
    sx={{
      minHeight: 44,
      borderRadius: 0,
      bgcolor: 'rgba(10, 12, 20, 0.82)',
    }}
  >
    {PAGE_SIZE_OPTIONS.map((option) => (
      <Option key={String(option.value)} value={option.value}>
        {option.label}
      </Option>
    ))}
  </Select>
</FormControl>
```

### 6. Render paginated posts instead of filtered posts
Update the post list rendering (the part that maps over posts) to use `group.paginatedPosts` instead of `group.filteredPosts`.

The empty state check should use `group.filteredPosts.length === 0` (total count), NOT paginatedPosts, so the "No stories" message still appears when there are truly no matching posts.

## Verification
- Each game section has a page size dropdown in the controls row
- Changing page size resets the current page to 1
- Changing sort or character filter resets the current page to 1
- Only the correct number of posts are shown per page
- "All" shows all posts with no pagination
- No TypeScript or lint errors
