# Task: Create GamePicker Component

## Preconditions
- Task 01 (`add-game-section-anchors`) must be completed first. The `game-${slug}` DOM IDs it creates are required for IntersectionObserver targeting and click-to-scroll.
- This component is a new file; no existing file to modify.

## Objective
Create a new `components/GamePicker.tsx` component — fixed-position floating pills on the left side of the viewport (desktop only) for navigating between game sections on the lore page.

## File to create
`components/GamePicker.tsx`

## Component specification

### Props
```ts
interface GamePickerGame {
  slug: string;
  title: string;
  coverUrl: string | null;
}

interface GamePickerProps {
  games: GamePickerGame[];
}
```
The `slug` matches the `id` on game sections: `game-${slug}`.

### Visual behavior

#### Positioning
- Fixed position on the left side of the viewport
- Vertically centered: `position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)'`
- Desktop only: `display: { xs: 'none', xl: 'flex' }` (hidden below 1280px)
- `zIndex` high enough to float above content (e.g., 1000)
- **No background container** — just raw pills in a column
- Column of pills: `Stack` with vertical `spacing` (e.g., 8px)

#### Default pill appearance
- Each pill is a `Box` shaped as a circle: `width: 12, height: 12, borderRadius: '50%'`
- Background color: primary color from `extractPaletteFromImage()` for that game's cover, or `#8b5cf6` fallback
- `transition: 'width 0.25s ease, padding 0.25s ease, border-radius 0.25s ease'` for smooth hover expansion
- `cursor: 'pointer'`

#### Hover expansion
- On hover, pill expands horizontally to show the game title
- Expanded width: ~120px, height unchanged at ~28–32px
- Shape becomes a rounded pill: `borderRadius: 9999px` (or `14px` for 28px height)
- Inner text: `Typography level="body-xs"` showing the game title, `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'`
- Text color: white or `common.white`
- Padding: `px: 1.5` (or `px: 12px`) when expanded; `p: 0` when collapsed
- Use MUI Joy `sx` with `'&:hover'` pseudo-selector to toggle width/padding/borderRadius

#### Click behavior
- Click handler: `document.getElementById(`game-${slug}`)?.scrollIntoView({ behavior: 'smooth' })`
- No Next.js router needed — direct DOM scroll is fine for same-page navigation

### Color extraction
- When `coverUrl` is provided, call `extractPaletteFromImage(coverUrl)` from `@/lib/theme/artPalette`
- Use `useState` + `useEffect` to trigger extraction when `coverUrl` changes
- While loading: use fallback color `#8b5cf6` (the project purple primary)
- If `coverUrl` is null, use fallback color `#8b5cf6` immediately
- Store extracted palette per game in a state map: `Record<string, string>` mapping slug → primary color

### Active pill tracking (IntersectionObserver)
- Use `useEffect` to set up one `IntersectionObserver`
- Observe all elements matching `#game-${slug}` for each game (skip if element doesn't exist)
- Options: `{ threshold: [0, 0.25, 0.5, 0.75] }` to get fine-grained visibility
- Track entries in a `Map<string, number>` mapping slug → intersection ratio
- On each observer callback, find the slug with the highest intersection ratio and set it as the active slug via `useState<string | null>`
- **Active pill style**: add a subtle white ring/border (`border: '2px solid rgba(255,255,255,0.9)'`) and slightly scale up (`transform: 'scale(1.15)'`)

### Floaty parallax effect (lerp animation)
- Use `requestAnimationFrame` loop in a `useEffect`
- Track `window.scrollY` on each frame
- The pills' vertical position should lag behind the scroll with a lerp:
  - `targetY = window.scrollY` (or some fraction of it for subtlety)
  - `currentY += (targetY - currentY) * 0.08` (lerp factor, tune between 0.05–0.12)
- Apply the lerped Y offset as additional `translateY` on the pill container:
  - Base: `top: '50%'` centers the pills
  - Additional transform: combine with `translateY(-50% + ${currentY * 0.3}px)` — the `0.3` multiplier makes the effect subtle
- Clean up rAF on unmount via `cancelAnimationFrame`
- The ref for the container should be via `useRef<HTMLDivElement>(null)`

### Complete imports
```ts
'use client';

import { Box, Stack, Typography } from '@mui/joy';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_ART_PALETTE, extractPaletteFromImage } from '@/lib/theme/artPalette';
import type { ExtractedPalette } from '@/lib/theme/artPalette';
```

Note: `extractPaletteFromImage` returns `Promise<ExtractedPalette>`. Use `.primary` from the resolved value for the pill background color. Cache in a `Record<string, string>` keyed by slug, mapping to the hex primary color string.

### Exports
- Export `GamePicker` as a named export
- Export `GamePickerGame` type

## Verification
- Component renders without errors
- Pills appear on the left side at desktop widths (≥1280px), hidden on mobile
- Hovering a pill expands it to show the game title
- Clicking a pill smooth-scrolls to the correct game section
- Active section tracking works (the pill for the currently visible section is highlighted)
- Parallax effect: pills move subtly as you scroll
- No background container visible — pills float directly on the page
