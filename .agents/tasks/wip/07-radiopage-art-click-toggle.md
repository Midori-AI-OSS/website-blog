# Task 07: Radio Page Art Click Toggle

## Objective
Make the cover art area a play/pause toggle with keyboard accessibility.

## Requirements

### Update: `app/radio/RadioPageClient.tsx`

**Current state:** The cover art is an `<img>` element (lines 978-990) inside a `<Box>`. It has no interactive behavior and no keyboard accessibility.

**Changes:**

1. **Wrap the cover art in an interactive element.** Use a `<Box component="button">` (MUI Joy's `component` prop) or a native `<button>` element. This provides built-in keyboard handling (Enter/Space) and focusability.

2. **Interaction:**
   - Click: call `togglePlayback()` (the existing handler at line 821).
   - Do NOT use `onClick` on the parent `<Box>` — replace the parent Box with a button element.

3. **Accessibility:**
   - `aria-label`: Use a dynamic label — `'Play Midori AI Radio'` when not playing, `'Pause Midori AI Radio'` when playing. Base this on `playbackDesired` (not `isPlaying`, because you can toggle to start playback even when not yet playing).
   - The button is natively focusable — no extra tabIndex or role needed.
   - Add visible focus state: `'&:focus-visible': { outline: '2px solid', outlineColor: 'primary.400', outlineOffset: 2 }`.

4. **Visual:**
   - No overlay play/pause icon. The cover art image stays exactly as-is.
   - Cursor: `cursor: 'pointer'` on hover.
   - The button styling should be transparent (no border, no background) — it should look like the existing container Box:
     ```
     border: 'none',
     background: 'none',
     padding: 0,
     width: '100%',
     height: '100%',
     display: 'flex',
     alignItems: 'center',
     justifyContent: 'center',
     cursor: 'pointer',
     ```
   - Keep the existing `minHeight: 0`, `overflow: 'hidden'` from the parent Box (lines 970-976).

5. **Placeholder state:** When no `artUrl` (the Music icon placeholder at line 992), also make that area a button with the same behavior.

6. **Layout preservation:** The cover art area is inside `flex: { md: '0 0 50%' }` column (line 967-976). Do NOT change this flex layout or dimensions.

**Edge cases:**
- Double-click should not cause issues (native button handles this).
- During channel switch (when audio is cross-fading), toggling should still work — the `togglePlayback` handler correctly uses refs for the latest state.
- The `key={artUrl}` on the `<img>` must be preserved so the `coverSlideIn` animation works.

## Done Criteria
- Click on cover art toggles play/pause
- Keyboard accessible via Enter and Space (native button behavior)
- Visible focus ring on keyboard focus (`:focus-visible`)
- No overlay play/pause icon
- Cursor changes to pointer on hover
- Cover art layout unchanged
