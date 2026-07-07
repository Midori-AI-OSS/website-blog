# Task 08: Radio Page Mobile Layout

## Objective
Restructure the radio page for mobile viewports with compact, no-scroll layout.

## Requirements

### Update: `app/radio/RadioPageClient.tsx`

**Reference: Current layout structure**
- Top bar (lines 937-961): header with "Midori AI Radio · Listening Room"
- Main content (lines 963-1151): two-column layout — left has cover art, right has track info + Track Story Sheet
- Bottom bar (lines 1154-1353): controls, progress, quality, volume

**Breakpoint:** Use MUI's breakpoint system. Mobile = `xs` (below `md`). Desktop = `md` and up. The codebase already uses `{ xs: ..., md: ... }` patterns.

**Mobile layout (above bottom bar):**

The main content area (lines 963-1151) should show ONLY:
1. Cover image (`<img>` from the left column) — keep full width, centered
2. Song title (`{title}`) — displayed below the cover image

Hide on mobile:
- Artist name (`{artist}` at line 1027)
- Status chip (`{streamStateLabel}` at line 1033-1038)
- Listener count (`{listenerCount}` at line 1006-1016)
- Track Story Sheet / Lore Panel / Lyrics Panel (already hidden via `display: { xs: 'none', md: 'flex' }`)

Approach: Use `display: { xs: 'none', md: 'flex' }` or `display: { xs: 'none', md: 'inline' }` on the elements to hide.

**Mobile bottom bar (compact single row):**

The bottom bar `<Sheet>` (lines 1154-1353) currently stacks vertically on xs. Replace with a single horizontal row:

```
[Quality Icon] [Progress Bar + Time] [Prev] [Play/Pause] [Next] [Volume]
```

Changes:
1. Quality selector: Keep the existing quality visualizer (lines 1175-1226) but ensure it fits in a compact row. The icon bars should stay as-is; the `minWidth: 44, minHeight: 44` already meets tap target requirements.
2. Progress bar + time: Already a horizontal row (lines 1228-1247) — keep as-is.
3. Playback controls: Already a horizontal row with prev/play/next buttons (lines 1249-1281) — keep as-is but ensure they fit in the single row.
4. Volume: Change from the horizontal dot rail (lines 1283-1348) to an **overlay vertical rail**. Implementation:
   - The `Volume2` icon stays visible as a toggle button.
   - On tap/click of the Volume2 icon, a vertical slider/rail appears above it as an overlay (positioned absolutely).
   - Use `position: 'absolute'` on the volume rail, `bottom: '100%'`, so it extends upward from the icon without causing layout shift.
   - The overlay should have a semi-transparent background (`bgcolor: 'rgba(8,8,14,0.92)'`, `backdropFilter: 'blur(12px)'`).
   - The vertical rail should contain 10 tappable segments (like the dots but vertical) for volume levels 0-100%.
   - Tap outside or second tap on the icon dismisses the overlay.
   - On **desktop**, the volume control stays as-is (horizontal hover rail). Use `display: { xs: 'none', md: 'flex' }` for the desktop volume rail, and `display: { xs: 'flex', md: 'none' }` for the mobile overlay version.

**Removals on mobile:**
- Channel selector: Add `display: { xs: 'none', md: 'inline' }` to the `<Box component="select">` element (line 1043).
- Navigation buttons (prev/next channel): Hide on mobile? The task says "playback controls (play/pause, skip)" — "skip" likely means track skip, not channel skip. The `StepBack`/`StepForward` currently navigate channels. **Clarification:** Hide the channel nav buttons on mobile. Keep only play/pause as the central button. Add `display: { xs: 'none', md: 'inline-flex' }` to the prev/next channel buttons.

**Constraints to verify:**
- No horizontal page scrolling at 360px width.
- All interactive tap targets must be at least 44x44 CSS pixels (this is already mostly true; verify after layout changes).
- The bottom bar must stay within the viewport at 360px.

**Implementation approach:**
- Use MUI's responsive `sx` props (`{ xs: ..., md: ... }`) for visibility.
- For the volume overlay, manage a `volOverlayOpen` boolean state for mobile. On desktop, the existing `volHovered` state works fine.
- Do NOT use separate mobile/desktop component trees — use conditional rendering and responsive sx props.

**Edge cases:**
- When the volume overlay is open on mobile and a track changes, the overlay should stay open (no auto-close).
- Channel switching from another browser tab (via storage events) should not disrupt the mobile layout.
- The bottom bar at mobile should have `py: 1` and `px: 2` for comfortable spacing.

## Done Criteria
- Mobile layout matches spec (cover + title above bar, compact single-row bottom bar)
- No horizontal scroll at 360px
- Tap targets >= 44x44 on mobile
- Channel selector hidden on mobile
- Volume as overlay vertical rail on mobile, horizontal hover rail on desktop
- Desktop layout unchanged
