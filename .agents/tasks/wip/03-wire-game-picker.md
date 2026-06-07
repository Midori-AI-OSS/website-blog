# Task: Wire GamePicker into LoreListPageClient

## Preconditions
- Task 01 (`add-game-section-anchors`) must be completed first.
- Task 02 (`create-game-picker`) must be completed first (provides `GamePicker` component and `GamePickerGame` type).

## Objective
Import and render the `GamePicker` component in the lore list page, passing the correct game data derived from the existing `gameGroups` prop.

## File to modify
`app/lore/LoreListPageClient.tsx`

## What to do

### 1. Import GamePicker
Add at the top of the file:
```ts
import { GamePicker } from '@/components/GamePicker';
import type { GamePickerGame } from '@/components/GamePicker';
```

### 2. Derive pickerGames data
Inside the component body, after the `groupsWithUiState` useMemo, add a `useMemo` that derives the `GamePickerGame[]` array:

```ts
const pickerGames = useMemo<GamePickerGame[]>(() => {
  return gameGroups.map((group) => ({
    slug: group.game.slug,
    title: group.game.title,
    coverUrl: getGameCoverImage(group.game.coverImage, group.posts),
  }));
}, [gameGroups]);
```

Note: `getGameCoverImage` is already defined locally in the file (lines 128–138) — no need to import it.

### 3. Render GamePicker
Before the main `<Stack spacing={3}>` that contains game sections, render the GamePicker:

```tsx
return (
  <>
    <GamePicker games={pickerGames} />
    <Stack spacing={3}>
      {/* existing game sections ... */}
    </Stack>
  </>
);
```

Wrap in a fragment (`<>...</>`) because the component currently returns a single `<Stack>`. The GamePicker must be a sibling, not a child.

If the existing empty-state early return fires (when `groupsWithUiState.length === 0`), do NOT render the GamePicker — only render it in the normal path.

### 4. Ensure the empty-state return still works
The early return for empty groups should remain unchanged:
```tsx
if (groupsWithUiState.length === 0) {
  return ( /* existing empty state JSX */ );
}
```

## Verification
- GamePicker pills appear on the left side of the lore page at desktop widths
- Clicking a pill scrolls to the corresponding game section
- The empty state (no game groups) still renders correctly without the GamePicker
- No TypeScript or lint errors
