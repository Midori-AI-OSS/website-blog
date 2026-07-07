# Task 01: Lore Session Config

## Objective
Create `lib/radio/loreSessionMap.ts` with session-to-slug family config and POV mapping, plus test file `lib/radio/loreSessionMap.test.ts`.

## Requirements

### File: `lib/radio/loreSessionMap.ts`

**Important TypeScript config:** `tsconfig.json` enables `verbatimModuleSyntax: true`, so all type-only imports MUST use `import type` syntax. Use `import type { ParsedPost } from '@/lib/blog/parser'`.

**Relevant existing type:** Use `ParsedPost` from `@/lib/blog/parser` (not `LorePost`). The `loadAllLorePosts()` in `@/lib/lore/loader` returns `ParsedPost[]`.

**Exported types to define:**

```ts
export interface LoreMatchResult {
  slug: string;
  href: string;          // e.g. '/lore/luz-blessee-bar'
  title: string;
  summary: string;
  coverImageUrl: string;
  tags: string[];
  game: string;
  episodeLabel: string;  // from metadata.episode_label, falls back to empty string
}

export interface LoreMatchParams {
  session: number;
  pov: string | null;       // POV name like 'luna', 'leo', 'echo', 'riley', 'weave' — or null
  posts: ParsedPost[];      // all loaded lore posts (use ParsedPost, not LorePost)
}

export type PovName = 'luna' | 'leo' | 'echo' | 'riley' | 'weave';
```

**Session-to-Slug Family Config (sessions 0-5):**
Hardcoded mappings for sessions 0 through 5. Each session maps to a family of possible lore slugs (an array of strings). Session 0 always maps to `['luz-blessee-bar']`.

Sessions 1-5 family arrays must be populated with concrete lore slugs. To determine these, inspect the lore posts' frontmatter: slugs in the `real-moments` game grouped by story arc. The mapping must be populated — do NOT leave placeholder arrays.

**By-channel POV detection:**
- For character channels (`lunar-mix`, `leo-mix`, `echo-mix`, `riley-mix`, `weave-mix`): detect POV directly from channel name using a channel-to-POV map (below).
- For the `all` channel: infer POV from aliases found in metadata texts (comment, backstory, theme). If no alias matches, POV is `null`.
- For non-character channels (`indie`, `instrumental`, `lofi`, `friends-music`, `bits-tech`, `recordatio`): return `null`.

**Channel-to-POV Direct Map:**
```
lunar-mix -> luna
leo-mix   -> leo
echo-mix  -> echo
riley-mix -> riley
weave-mix -> weave
```

**POV alias detection map:**
Map each `PovName` to an array of possible text aliases (lowercase strings) found in metadata texts. Example structure:
```
luna  -> ['luna', 'luna midori']
leo   -> ['leo', 'leo midori']
echo  -> ['echo']
riley -> ['riley']
weave -> ['weave', 'w.e.a.v.e.']
```
Populate with the actual aliases used in metadata. Keep entries lowercase for matching.

**Session 4 subarc alias map:**
Special alias mapping for session 4 subarcs. This is used when session === 4 and the general alias detection does not find a POV. The subarc alias map overrides the general alias map for session 4. Populate with concrete session-4-specific aliases — do NOT leave empty.

**`all` channel behavior:**
When channel is `all`, POV is inferred by scanning metadata texts through the alias detection map. If no alias matches, POV is `null`. When POV is null and session > 0, use the session's slug family to find any post matching the session (ignoring character POV filter) — return the first match alphabetically by slug. When session === 0, always return `luz-blessee-bar` (POV does not matter for session 0).

**Pure functions to export:**
- `normalizeSessionNumber(input: unknown): number | null` — coerces to integer via `Number(input)`, returns `null` for non-finite, NaN, or negative results
- `detectHighestSession(posts: ParsedPost[]): number` — finds highest session number among posts. **Clarification:** Since the codebase has no explicit `session` frontmatter field, determine session number by: (a) if the slug is nested under `real-moments/session-N/`, extract N from the directory path, or (b) derive session from the slug family mapping (check which session family each post's slug belongs to). If neither works, fall back to 0. If posts array is empty, return 0.
- `detectPovFromChannel(channel: string): PovName | null` — maps channel name to POV. Case-insensitive input matching.
- `detectPovFromAliases(texts: string[]): PovName | null` — scans each text (case-insensitive) for aliases from the POV alias detection map. Returns the first matching POV name, or `null` if none found. Empty array returns `null`. Null/undefined entries in the array are skipped.
- `resolveLoreMatch(params: LoreMatchParams): LoreMatchResult | null` — combines the above to find a matching lore slug. Filters `params.posts` to only those with `game: 'real-moments'`. Within the session's slug family, finds the post whose character tag matches `params.pov`. If `params.pov` is null: for session 0, return `luz-blessee-bar`; for sessions > 0, return the first post in the family alphabetically by slug. If no matching post exists in the family for the given POV, return `null`.

**Missing POV in family returns null.**

**Edge cases to handle:**
- `normalizeSessionNumber` must handle: `undefined`, `null`, `NaN`, `Infinity`, negative numbers, float strings like `"3.7"` (should return `3`), non-numeric strings, empty string.
- `detectPovFromAliases` must handle: empty array, array with empty strings, array with null/undefined entries, partial matches (e.g., text containing 'luna midori' should still detect 'luna').
- `resolveLoreMatch` must handle: empty posts array, session out of range (no family defined), POV that has no post in the family, posts with missing episode_label.
- `detectHighestSession` must handle: empty posts array, posts with no determinable session.

### File: `lib/radio/loreSessionMap.test.ts`

Use `bun:test` with `describe`, `test`, `expect` (match existing patterns in `lib/radio/images.test.ts`).

Write tests for all pure functions:
- `normalizeSessionNumber` with valid/invalid/edge inputs
- `detectHighestSession` with empty and populated arrays
- `detectPovFromChannel` for all known channels, non-character channels, unknown channels, and case variations
- `detectPovFromAliases` with matching text, non-matching text, empty array, aliases in mid-string
- `resolveLoreMatch` with session 0 (always `luz-blessee-bar`), session > 0 with known POV, session > 0 with null POV, unknown session, missing POV post
- Session 0 always returns `luz-blessee-bar` regardless of POV or channel
- Missing POV for a session > 0 returns `null`

Test runner: `bun test`

## Done Criteria
- Both files exist and compile
- Tests pass via `bun test`
- Exports are typed (and use `import type` where required by `verbatimModuleSyntax`)
- Session slug families are populated with concrete lore post slugs (not placeholder arrays)
