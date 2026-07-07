# Task 06: Radio Page Lyrics Panel

## Objective
Add a lyrics panel under the active story/lore box using `lyricsEng` data from probe.

## Requirements

### Update: `app/radio/RadioPageClient.tsx`

**Note on task 03 dependency:** Task 03 adds `lyricsEng` to the `ProbeMetadata` interface and the probe API response. If task 03 is not yet done, add the field to `ProbeMetadata` now:
```ts
lyricsEng?: string | null;
```

**Normalization logic (derived state, can be inline):**
```ts
const lyricsText = (probeData?.lyricsEng ?? '').trim();
const showLyrics = !!(lyricsText && !lyricsText.includes('[Instrumental]'));
```

- Hide panel when `lyricsEng` is `null`, `undefined`, empty string, or whitespace-only.
- Hide panel when `lyricsEng` contains `[Instrumental]` (case-sensitive match is fine since the tag will be `[Instrumental]` as written).
- Only show on desktop (match the same breakpoint as the Track Story Sheet).

**Placement:**
Render the lyrics panel as a `<Sheet>` **below** the existing Track Story / lore panel `<Sheet>`, inside the same right-column `Stack` (the `<Stack sx={{ flex: 1, overflow: 'hidden', ... }}>` at line 996-1003).

The lyrics panel should have:
- Same outer styling as the Track Story Sheet: `variant="outlined"`, `borderRadius: 0`, `bgcolor: 'rgba(10,12,18,0.4)'`, `borderColor: 'rgba(255,255,255,0.08)'`.
- `display: { xs: 'none', md: 'flex' }` — hidden on mobile.
- `flexDirection: 'column'`.
- `mt: 1` to separate from the story/lore panel above.
- Fixed max-height (e.g. `maxHeight: '40%'`) with `overflow: 'auto'` for scrollable lyrics.
- Padding: `px: 2, py: 1.5`.

Inside:
1. **Header:** `<Typography>` with "Lyrics" (uppercase, same text styling as the Track Story header).
2. **Content:** `<Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>` displaying `lyricsText`.
3. **Animation:** Apply fade animation on content change. Use `key={currentTrackId ?? 'idle'}` on the content container to trigger remount on track change. Use the existing `fadeIn` animation.

**Loading state:**
If `probeLoading` is true and no previous `lyricsEng` value exists, show skeleton text (reuse the `<Skeleton>` component pattern from the Track Story section). If probe is loading but previous lyrics exist, keep showing previous lyrics.

**Mobile behavior:**
Hidden on mobile via `display: { xs: 'none', md: 'flex' }`. No additional media queries needed.

**Edge cases:**
- `probeData` is `null` → hide panel.
- `probeData.ok` is `false` → hide panel.
- `lyricsEng` contains only `[Instrumental]` with no other text → hide panel.
- Very long lyrics → scrollable with `overflow: 'auto'`.

## Done Criteria
- `lyricsEng` typed in ProbeMetadata (or added here if task 03 not done)
- Empty/Instrumental/whitespace-only lyrics hidden
- Desktop-only panel under story/lore box
- Fade animation on content change
- Scrollable for long lyrics
- Hidden on mobile
