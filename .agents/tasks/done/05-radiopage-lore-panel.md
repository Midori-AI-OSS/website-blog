# Task 05: Radio Page Lore Panel

## Objective
Replace Track Story with a lore panel when a lore match exists.

## Requirements

### Update: `app/radio/RadioPageClient.tsx`

**Context:** The "Track Story section" is the `<Sheet>` at approximately line 1086-1149, rendered inside the right-column `Stack`. It currently shows `probeData?.comment` or skeleton loading. This task replaces it with a lore panel when `loreMatch` is not null.

**Conditional rendering logic:**

```
if (loreLoading && !loreMatch) -> show skeleton (existing skeleton pattern, line 1134-1138)
else if (loreMatch) -> show lore panel (new)
else -> show existing Track Story section (the comment display or fallback text)
```

**Lore panel design:**

Replace the entire `<Sheet variant="outlined">` block (lines 1086-1149) with a conditional that renders either the lore panel or the existing Track Story section.

The lore panel should be a `<Sheet>` with the same outer styling as the existing Track Story Sheet:
- Same dimensions, `variant="outlined"`, `borderRadius: 0`, same bgcolor, etc.
- The existing Sheet is hidden on mobile via `display: { xs: 'none', md: 'flex' }` — keep this behavior.

Inside the lore panel:
1. **Header row:** `<Typography>` with label text like "Connected Lore" (uppercase, same styling as "Track Story" header at line 1101-1107).
2. **Blurred cover image background:** The cover image (`loreMatch.coverImageUrl`) rendered as a background layer inside the Sheet. Use a `<Box>` with:
   - `position: 'absolute'`, `inset: 0`
   - `backgroundImage: url(...)`, `backgroundSize: 'cover'`, `backgroundPosition: 'center'`
   - `filter: 'blur(20px) brightness(0.15)'`
   - `opacity: 0.35`
   - `zIndex: 0`
   - `pointerEvents: 'none'`
3. **Content overlay** (positioned relative, zIndex 1):
   - `loreMatch.title` as a heading (`<Typography level="title-md">`)
   - `loreMatch.summary` as body text (`<Typography level="body-sm">`)
   - `loreMatch.episodeLabel` as a subtle subtitle if present
   - Link to the lore post: `loreMatch.href` — use Next.js `<Link>` or a plain `<a>` linking to the lore page (same tab, no `target="_blank"`).
4. **Animation:** On panel appearance, use the existing `fadeIn` keyframe animation (already defined at line 51-54). Apply `animation: ${fadeIn} 0.3s ease-out`. Use `key={loreMatch.slug}` on the content container so React remounts on match change, triggering the animation.

**When no lore match:**
Keep the existing Track Story section as-is. The existing behavior (showing `probeData?.comment`, skeleton during probeLoading, or fallback text) must be preserved exactly.

**Mobile behavior:**
The lore panel inherits the existing `display: { xs: 'none', md: 'flex' }` from the Track Story Sheet — it's hidden on mobile. No additional media query needed.

**Edge cases:**
- `loreMatch.episodeLabel` may be empty string — don't render it if falsy.
- `loreMatch.summary` may be empty — show fallback text like "No summary available."
- `loreMatch.coverImageUrl` may be empty — skip the blurred background layer.

## Done Criteria
- Lore panel replaces Track Story when `loreMatch` is not null
- Smooth fadeIn transition on appear
- Hidden on mobile (same as Track Story)
- Falls back to Track Story when no match
- Cover image blurred background when available
- Link navigates to lore post (same tab)
