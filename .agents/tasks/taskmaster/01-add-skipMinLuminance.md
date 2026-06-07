# Task 01: Add `skipMinLuminance` option to `extractPaletteFromImage`

**File:** `lib/theme/artPalette.ts`

## Changes

### 1. Extend the options type
On line 104, the options parameter is typed as `{ fallback?: ExtractedPalette }`. Add `skipMinLuminance?: boolean` to this type.

### 2. Use the option when building the result
On lines 205-211, the function builds the result object:
```ts
resolve({
  primary: ensureMinLuminance(rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b)),
  secondary: ensureMinLuminance(rgbToHex(secondaryColor.r, secondaryColor.g, secondaryColor.b)),
  tertiary: ensureMinLuminance(rgbToHex(tertiaryColor.r, tertiaryColor.g, tertiaryColor.b)),
});
```

When `options.skipMinLuminance` is `true`, return raw `rgbToHex(...)` values without wrapping in `ensureMinLuminance(...)`. When `false` or absent, keep existing behavior (wrapped in `ensureMinLuminance`).

## Validation
- After editing, run `bun lint` (or `bunx biome check .`) to confirm no regressions.
- Confirm `DEFAULT_ART_PALETTE` (lines 90-94) is unchanged — it hardcodes `ensureMinLuminance` and is not affected.
- Existing callers (TtsPlayer, PostView, BlogCard, DynamicBackdropProvider) do not pass `skipMinLuminance`, so they default to `false` — zero impact.

## Done criteria
- `extractPaletteFromImage` accepts and respects `{ skipMinLuminance?: boolean }`.
- Default behavior (no option passed) is identical to current.
