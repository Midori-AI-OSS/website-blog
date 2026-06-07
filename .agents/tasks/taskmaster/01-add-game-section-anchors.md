# Task: Add Game Section Anchors

## Objective
Add `id` attributes and `scroll-margin-top` to each game section in the lore list page so that smooth-scrolling and IntersectionObserver targeting work correctly.

## File to modify
`app/lore/LoreListPageClient.tsx`

## What to do

### 1. Add `id` attribute to each game section's outer Box
Find the `<Box key={group.game.slug} ...>` that wraps each game group (around line 199). Add an `id` prop:
```
id={`game-${group.game.slug}`}
```

### 2. Add `scroll-margin-top` to game section Box
In the `sx` prop of that same Box, add:
```
scrollMarginTop: '80px'
```
This prevents sections from being hidden under any sticky headers when smooth-scrolled into view.

## Verification
- The rendered HTML should have `<div id="game-automata-dreams" ...>` (and for each other game slug)
- The `scroll-margin-top: 80px` should appear in the element's inline style
- No other behavior changes
