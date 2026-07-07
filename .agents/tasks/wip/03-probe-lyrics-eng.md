# Task 03: Probe Lyrics-eng Extraction

## Objective
Extract the `lyrics-eng` FFprobe tag from the radio probe endpoint and return it as `lyricsEng` in the API response. Add pure extraction + normalization logic tested in `lib/radio/probe.test.ts`.

## Requirements

### Update: `app/api/radio/probe/route.ts`

1. Add `'lyrics-eng'` to the `TAG_KEYS` array (the const array at line 16-26).
2. The response currently spreads `...tags` (line 120), so after adding to `TAG_KEYS`, the `lyrics-eng` tag will be extracted and spread into the response as `lyrics-eng` (with hyphen). Rename it to `lyricsEng` for the JSON response. Add explicit field after the spread:
   ```ts
   lyricsEng: tags['lyrics-eng'] ?? null,
   ```
3. Do NOT filter/omit `[Instrumental]` in the API route — always return the raw value. Filtering is the client's responsibility (task 06).
4. Trim whitespace from the extracted value before returning (the `readStringTag` function already trims, but double-check by calling `.trim()` on the final value).

### Create: `lib/radio/probe.test.ts`

Use `bun:test` with `describe`, `test`, `expect` (match existing patterns in `lib/radio/images.test.ts`).

**Extract the lyrics-eng reading logic into a pure helper function** in `lib/radio/probeHelpers.ts` (or inline in the test module) so it can be unit-tested without ffprobe:
```ts
export function extractLyricsEng(rawTags: Record<string, unknown>): string | null
```

Test cases:
- `lyrics-eng` tag present with lyrics text → returns trimmed text
- `lyrics-eng` tag absent → returns `null`
- `lyrics-eng` tag is whitespace-only → returns `null` (trim to empty → null)
- `lyrics-eng` tag contains `[Instrumental]` → still returns the value (client filters), but verify extraction works
- `lyrics-eng` tag with leading/trailing whitespace → returned trimmed
- `lyrics-eng` tag with case-insensitive key match (e.g., `Lyrics-Eng`) → still found
- Empty tags object → returns `null`
- `null` tags → returns `null`

**Update the probe route** to import and use `extractLyricsEng`.

### Also update: `app/radio/RadioPageClient.tsx`

Update the `ProbeMetadata` interface (line 58-76) to include:
```ts
lyricsEng?: string | null;
```
This is needed so the lyrics panel (task 06) can read the value. Do this here since it's the probe response shape change.

## Done Criteria
- `lyricsEng` appears in probe API response (check: `GET /api/radio/probe?channel=all`)
- `extractLyricsEng` function is unit tested in `lib/radio/probe.test.ts`
- ProbeMetadata interface updated with `lyricsEng`
- Whitespace trimmed, null for whitespace-only
- Existing probe response fields still work
