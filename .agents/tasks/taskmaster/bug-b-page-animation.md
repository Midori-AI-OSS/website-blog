# Bug B: No page-to-page animation

**File to edit:** `app/lore/LoreListPageClient.tsx`

## Problem
When changing pages via the pagination controls, posts snap-render instantly with no transition. There's no visual cue that content changed.

## Fix

### 0. Prerequisites
- `@emotion/react` is already a project dependency (v11.14.0) — no install needed.
- `keyframes` from `@emotion/react` provides the CSS animation definitions.

### 1. Add new imports (line 17)
The existing `import { useMemo, useState } from 'react';` on line 17 needs `useRef` and `useEffect`. Change line 17 to:
```ts
import { useEffect, useMemo, useRef, useState } from 'react';
```
Also add the keyframes import on a new line (e.g., after line 17):
```ts
import { keyframes } from '@emotion/react';
```

### 2. Define the animation (add after all import statements, before the component):
```ts
const fadeInFromRight = keyframes`
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const fadeInFromLeft = keyframes`
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
`;
```

### 3. Add a ref to track previous page per game
Inside the `LoreListPageClient` component, after the existing state declarations (after line 158), add:
```ts
const prevPageByGame = useRef<Record<string, number>>({});
```

### 4. Compute animation direction per group
Inside the `groupsWithUiState` useMemo (lines 160-194), or more practically, use a separate `useMemo` or compute it inline in the render loop. The cleanest approach: compute `animationName` per group in the render map (lines 228-604).

In the render loop where `groupsWithUiState.map((group) => { ... })`, add before the return:
```ts
const prevPage = prevPageByGame.current[group.game.slug];
let animationName: string | undefined;
if (prevPage != null && group.currentPage !== prevPage) {
  animationName = group.currentPage > prevPage ? 'fadeInFromRight' : 'fadeInFromLeft';
} else {
  animationName = undefined;
}
```

Then update the ref **after** the render to store the new page. This must happen via `useEffect` to avoid rendering during render:
Add this `useEffect` inside the component (after the useMemo, before the return):
```ts
useEffect(() => {
  for (const group of groupsWithUiState) {
    prevPageByGame.current[group.game.slug] = group.currentPage;
  }
}, [groupsWithUiState]);
```

### 5. Apply animation to the post container Stack
The post container is the `<Stack spacing={1.25}>` that opens at line 436 and closes at line 472 (there is no second `<Stack spacing={1.25}>` — line 472 is the `</Stack>` closing tag). Find the opening at line 436:

```tsx
<Stack spacing={1.25}>
```

Change to:
```tsx
<Stack
  key={`${group.game.slug}-${group.currentPage}`}
  spacing={1.25}
  sx={
    animationName
      ? {
          animation: `${animationName} 280ms ease-out`,
        }
      : undefined
  }
>
```

This keys the post container on the game+page combo, so React remounts the entire Stack when the page changes, triggering the CSS animation.

**Important:** The `Stack` on line 436 is also used for the "No stories match" empty state (lines 437-450). The empty state doesn't benefit from animation, but keying it won't hurt. If you want to scope the animation only to the populated case, extract the two branches more explicitly — but keying the whole Stack is simpler and works fine since the empty state just remounts a static box.

## Acceptance criteria
- Going from page 1→2 slides posts in from the right
- Going from page 2→1 slides posts in from the left
- First render (no previous page) has no animation — posts appear instantly
- Changing sort mode or character filter resets to page 1 and shows no animation (since the ref tracks per-game and the page change triggers within the same game)
- The "No stories match" empty state causes no visual glitch
