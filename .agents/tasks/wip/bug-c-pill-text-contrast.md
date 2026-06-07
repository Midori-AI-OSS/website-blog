# Bug C: Pill text unreadable on light backgrounds

**Files to edit:** `lib/theme/artPalette.ts` and `components/GamePicker.tsx`

## Problem
The floating game-picker pills use `bgcolor: getColor(game.slug)` which returns `palette.primary` from `extractPaletteFromImage()`. The text is always `color: 'common.white'`. When the extracted primary color is a light pastel (e.g., pale yellow, light cyan), the white text becomes unreadable.

**Root cause note:** `extractPaletteFromImage` already calls `ensureMinLuminance` on extracted colors (artPalette.ts line 206), which pushes luminance *up* to 0.55 minimum. This guarantees many extracted colors will be light pastels — exactly the problem scenario.

## Fix

### 0. Export color helpers from artPalette.ts (prerequisite)
`rgbToHsl` (line 29) and `hslToRgb` (line 51) are currently private functions in `lib/theme/artPalette.ts`. Export them so GamePicker can use them:

- Line 29: change `function rgbToHsl(` → `export function rgbToHsl(`
- Line 51: change `function hslToRgb(` → `export function hslToRgb(`

### 1. Update imports in GamePicker.tsx (lines 5-6)
Change:
```ts
import type { ExtractedPalette } from '@/lib/theme/artPalette';
import { DEFAULT_ART_PALETTE, extractPaletteFromImage } from '@/lib/theme/artPalette';
```
to:
```ts
import type { ExtractedPalette } from '@/lib/theme/artPalette';
import {
  DEFAULT_ART_PALETTE,
  extractPaletteFromImage,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
} from '@/lib/theme/artPalette';
```

### 2. Add a luminance check + darkening helper
After the `getColor` helper (line 86, may shift to ~90 after import changes), add:
```ts
function ensureReadableBackground(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luminance <= 150) return hex;
  // Too light — darken by reducing HSL lightness to 0.35
  const [h, s] = rgbToHsl(r, g, b);
  const [dr, dg, db] = hslToRgb(h, s, 0.35);
  return rgbToHex(dr, dg, db);
}
```

### 3. Apply the darkening in the color extraction effect
Inside the `useEffect` for color extraction (lines 25-33), change line 30 (may shift slightly):
```ts
setColors((prev) => ({ ...prev, [game.slug]: palette.primary }));
```
to:
```ts
setColors((prev) => ({ ...prev, [game.slug]: ensureReadableBackground(palette.primary) }));
```

### 4. Add textShadow to the Typography
The Typography on lines 136-146 renders the game title inside the pill. Add `textShadow` to its `sx`. Change the `sx` from:
```ts
sx={{
  color: 'common.white',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}}
```
to:
```ts
sx={{
  color: 'common.white',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  textShadow: '0 0 3px rgba(0,0,0,0.6)',
}}
```

## Acceptance criteria
- Pills with light extracted colors (luminance > 150) get automatically darkened to HSL lightness 0.35
- Pills with already-dark colors (luminance ≤ 150) remain unchanged
- White text is readable on all pill backgrounds
- The textShadow provides a safety net for edge cases at the luminance boundary
