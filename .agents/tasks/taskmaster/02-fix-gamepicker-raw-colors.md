# Task 02: Fix GamePicker to use raw cover colors with contrast-aware text

**File:** `components/GamePicker.tsx`

Depends on: Task 01 (`skipMinLuminance` must be available in `extractPaletteFromImage`).

## Changes

### 1. Pass `skipMinLuminance: true`
On line 45, change:
```ts
extractPaletteFromImage(game.coverUrl)
```
to:
```ts
extractPaletteFromImage(game.coverUrl, { skipMinLuminance: true })
```

### 2. Remove `ensureReadableBackground` function
Delete the entire function on lines 25-33.

### 3. Clean up imports
Remove these unused imports from the `@/lib/theme/artPalette` import block (lines 6-13):
- `hslToRgb`
- `rgbToHex`
- `rgbToHsl`

Keep `hexToRgb` — it is needed for the luminance calculation. Also keep `DEFAULT_ART_PALETTE`, `extractPaletteFromImage`, and the type import `ExtractedPalette`.

### 4. Change `colors` state shape
Current (line 37): `Record<string, string>` (slug → hex color)

Change to: `Record<string, { bg: string; text: string }>` (slug → { background color, text color })

### 5. Compute contrast-aware text color at extraction time
In the `.then()` callback (line 45-47), after receiving the palette:
- Use `hexToRgb` on the `primary` color to get `[R, G, B]`.
- Compute luminance: `0.299*R + 0.587*G + 0.114*B`.
- If luminance < 128: text color = `'common.white'` (MUI Joy theme token for white).
- If luminance >= 128: text color = `'#0a0a0f'`.
- Store `{ bg: palette.primary, text: <computed> }` for the slug.

### 6. Update `getColor` helper
Current (line 107): `const getColor = (slug: string): string => colors[slug] ?? DEFAULT_ART_PALETTE.primary;`

Since state is now `{ bg, text }`, update this helper. Either:
- Rename to `getPillColors(slug)` returning `{ bg, text }` with fallback: `{ bg: DEFAULT_ART_PALETTE.primary, text: 'common.white' }`.
- Or replace inline in the render with direct access plus fallback.

### 7. Update rendering
- On the `Box` (line 139), change `bgcolor: getColor(game.slug)` to use the `bg` property.
- On the `Typography` (line 156-164):
  - Change `color: 'common.white'` to use the computed `text` color.
  - Remove `textShadow: '0 0 3px rgba(0,0,0,0.6)'` (line 163).

## Validation
- After editing, run `bun lint` (or `bunx biome check .`) to confirm no regressions.
- Verify no remaining references to `ensureReadableBackground` in the codebase.
- Verify no remaining unused imports from `@/lib/theme/artPalette` in GamePicker.

## Done criteria
- GamePicker passes `skipMinLuminance: true`.
- `ensureReadableBackground` is gone from the codebase.
- Pill background uses raw extracted colors.
- Text color is contrast-aware (light on dark bg, dark on light bg).
- No `textShadow` on pill text.
- Lint passes clean.
