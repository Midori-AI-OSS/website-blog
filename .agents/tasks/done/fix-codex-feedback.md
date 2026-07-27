# Task: Fix all 4 Codex P2 review suggestions on PR #81

Fix the following issues in the radio page vibes feature:

## File: app/radio/RadioPageClient.tsx

1. **Line 290 area - Hydration mismatch for showVibes**: The `showVibes` state initializer reads localStorage directly in useState, causing server/browser hydration mismatch. Fix: use a server-stable initial value (e.g., `false`) and restore `showVibes` in the existing post-mount state-loading effect.

2. **Line 1211 area - Cancel pending hide timer when re-enabling vibes**: If user hides then re-enables visualization within the 350ms fade, `vibeSeed` still equals the active seed, so the early return leaves the hide timer running and opacity at zero. The timer then clears `displayedVibeSeed` even though vibes are enabled. Fix: cancel or invalidate the pending timer and restore visibility on re-enable.

## File: components/radio/VibesCanvas.tsx

3. **Line 184 area - Recompute colors when artwork palette arrives**: The color effect only reruns for `visualSeed`; `paletteRef.current` changing does not trigger it. If probe metadata arrives before the new palette, the canvas retains null or previous track's palette. Fix: include palette changes in the recoloring lifecycle.

4. **Line 214 area - Redraw static canvases after scene changes**: With `prefers-reduced-motion: reduce`, the first frame sets `startTimeRef` and the next callback exits without scheduling another frame. Subsequent `visualSeed` changes only update scene refs, so long tracks never display later static scenes. Fix: schedule a redraw when scene or reduced-motion preference changes instead of permanently terminating the loop.
