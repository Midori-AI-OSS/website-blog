# Task 02: Lore Match API Route

## Objective
Create `app/api/radio/lore-match/route.ts` as a GET API route that resolves lore matches for radio tracks.

## Requirements

### File: `app/api/radio/lore-match/route.ts`

**Important TypeScript config:** `tsconfig.json` enables `verbatimModuleSyntax: true`. Use `import type` for type-only imports.

**Runtime:** Use `export const runtime = 'nodejs';` (needed for filesystem access via `loadAllLorePosts`).

**Route:** `GET /api/radio/lore-match`

**Query parameters (all via `nextUrl.searchParams`):**
- `title` (string, required)
- `channel` (string, required) — normalized via `normalizeChannel()` from `@/lib/radio/contract`
- `comment` (string, optional)
- `backstory` (string, optional) — maps from `midori_ai_backstory` probe field
- `theme` (string, optional) — maps from `midori_ai_music_theme` probe field

If `title` or `channel` are missing/empty, return `{ ok: false }` (400 is fine, but `{ ok: false }` with 200 is also acceptable for consistency).

**Behavior:**
1. Use `loadAllLorePosts()` from `@/lib/lore/loader` to load all lore posts. This is an async function — must be awaited.
2. Import from `@/lib/radio/loreSessionMap` (the file created in task 01):
   - `resolveLoreMatch` — the main matching function
   - `normalizeSessionNumber` — to detect session from the title
   - `detectHighestSession` — if session cannot be inferred from title
   - `detectPovFromChannel` or `detectPovFromAliases` — based on channel type
3. **Exclude posts that should not be matched:**
   - Posts with `metadata.password` set (password-gated)
   - Posts whose publish date is in the future: use `getPublishState()` from `@/lib/content/publish` (import `getPublishState`). Pass the post's `metadata.date` and `new Date()`. Only include posts where `isPublished` is `true`.
   - Posts NOT in the `real-moments` game (filter `game !== 'real-moments'`)
4. How to detect session from title: The track title may contain a session indicator like "Session 1", "Session 2", etc. Use `normalizeSessionNumber()` on the title (or a regex extract like `/session\s*(\d+)/i`) to attempt session detection. If not found, fall back to `detectHighestSession(posts)` to get the current highest session.
5. How to detect POV: For character channels, use `detectPovFromChannel()`. For the `all` channel, collect metadata texts from `[comment, backstory, theme].filter(Boolean)` and pass to `detectPovFromAliases()`. For non-character channels, POV is `null`.
6. Call `resolveLoreMatch({ session, pov, posts })`.
7. Return JSON response with `Cache-Control: no-store` headers (see `NO_STORE_HEADERS` pattern in `app/api/radio/probe/route.ts`).

**Response shape:**
```ts
{ ok: true, match: null | LoreMatchResult }
```
where `LoreMatchResult` is imported from `@/lib/radio/loreSessionMap`.

**Error handling:**
- Any caught exception: return `{ ok: false }` with status 200 (consistent with other radio API routes).
- Do NOT expose internal error details in the response.

## Done Criteria
- Route exists and handles all query params
- Integrates with loreSessionMap from task 01
- Filters out password-gated AND future-dated posts
- Error handling returns `ok: false`
- Uses `runtime = 'nodejs'`
- Uses `import type` for type-only imports per `verbatimModuleSyntax`
