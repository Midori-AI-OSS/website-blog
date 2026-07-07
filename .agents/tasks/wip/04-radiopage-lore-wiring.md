# Task 04: Radio Page Lore Wiring

## Objective
Wire up lore match fetching in the radio page client when track/probe data changes.

## Requirements

### Update: `app/radio/RadioPageClient.tsx`

**Type definition — add to the file (above the component):**
```ts
interface LoreMatchData {
  slug: string;
  href: string;
  title: string;
  summary: string;
  coverImageUrl: string;
  tags: string[];
  game: string;
  episodeLabel: string;
}
```

**State — add to the component's useState declarations:**
```ts
const [loreMatch, setLoreMatch] = React.useState<LoreMatchData | null>(null);
const [loreLoading, setLoreLoading] = React.useState(false);
```

**Data fetching — add a new useEffect:**
Trigger when `currentTrackId` changes OR when `probeData` changes. Dependencies: `[currentTrackId, channel, probeData, hydrated]`.

1. Clear `loreMatch` and set `loreLoading = true` when triggered.
2. Construct the fetch URL with these query parameter mappings:
   - `title` = `currentTrack?.title ?? ''` (from CurrentPayload)
   - `channel` = `normalizeChannel(channel)` (the current selected channel)
   - `comment` = `probeData?.comment ?? ''` (from ProbeMetadata)
   - `backstory` = `probeData?.midori_ai_backstory ?? ''` (from ProbeMetadata)
   - `theme` = `probeData?.midori_ai_music_theme ?? ''` (from ProbeMetadata)
3. Fetch `GET /api/radio/lore-match?title=...&channel=...&comment=...&backstory=...&theme=...`
4. On success (`response.ok` and `data.ok`), set `loreMatch = data.match`.
5. On any error (network, non-ok response), set `loreMatch = null`.
6. Always set `loreLoading = false` in finally.
7. Use an `AbortController` to cancel in-flight requests on cleanup (same pattern as the existing probe fetch effect at line 566-617).

**Edge cases:**
- If `currentTrackId` is `null`, skip fetch (clear loreMatch, set loreLoading false).
- If `hydrated` is `false`, skip fetch.
- If the API returns `{ ok: false }`, treat as no match (`loreMatch = null`).

**Important:**
- Do NOT display raw `backstory`/`theme` metadata anywhere in the UI. These fields are only used for lore matching, not for display. (This applies to the existing Track Story section too — ensure `midori_ai_backstory` and `midori_ai_music_theme` are never rendered.)

## Done Criteria
- Lore match is fetched on track change AND probe data arrival
- State updates correctly (loading → result or null)
- Proper cleanup with AbortController
- No raw backstory/theme rendered
- Graceful handling of missing/failed API
