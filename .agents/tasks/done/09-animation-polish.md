# Task 09: Animation Polish

## Objective
Tune animations across radio components for smooth, subtle feel. Respect `prefers-reduced-motion`.

## Requirements

### Components to tune:

**1. BlobProgressBar** (`components/radio/BlobProgressBar.tsx`)
- Review and tune the SVG wave animation. The wobble comes from the animated SVG path using `animate` or `animateTransform` elements.
- Ensure the wobble motion is smooth and non-distracting.
- Check easing — should feel organic, not mechanical.
- Reduce amplitude if it feels too aggressive.
- Apply `@media (prefers-reduced-motion: reduce)` to stop animation (freeze waves at a static position).

**2. Backdrop/Palette** (`app/radio/RadioPageClient.tsx`)
- The background layer (lines 898-913) already has opacity transitions. Review the timing.
- Currently uses 1.5s ease-in-out for art background opacity. Consider tuning to ~500ms ease for palette/color transitions if any are introduced.
- If the `artPalette` is used to tint any UI elements, add smooth color transitions: `transition: 'color 0.5s ease, background-color 0.5s ease'`.
- Apply reduced-motion: disable background opacity transitions, use instant swaps.

**3. Player controls** (buttons in the bottom bar, lines 1249-1281)
- Hover state: add subtle scale transform (`transform: 'scale(1.05)'`) with `transition: 'transform 0.15s ease'`.
- Press/active state: brief scale down (`transform: 'scale(0.95)'`) with `transition: 'transform 0.1s ease'`.
- No jarring color jumps — use MUI's built-in hover/active color transitions (they're already smooth).
- Apply reduced-motion: disable transform on hover/active.

**4. Panel content transitions** (lore panel, lyrics panel, Track Story)
- These panels are implemented in tasks 05/06. When they exist:
  - Content swap animation: fade out old content (200ms), fade in new content (300ms ease-out).
  - Use `key={uniqueContentId}` on content containers to trigger React remount + CSS animation.
  - The existing `fadeIn` keyframe (line 51-54) can be reused.
- Apply reduced-motion: disable content swap animations, use instant swaps.

**5. Cover art slide-in** (existing animation, lines 46-49)
- Already has `coverSlideIn` animation at 0.4s ease-out.
- Tune if needed — currently it's a slide from right. Consider if it should be a fade instead.
- Apply reduced-motion: disable slide, use instant appearance.

### Accessibility: `prefers-reduced-motion`

Add a global CSS rule or per-component `@media` queries:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

OR use component-level overrides. Prefer the global approach (can be added to a global CSS file or as a `<style>` tag in the layout). But the least invasive approach is to add reduced-motion handling per-component via `@media (prefers-reduced-motion: reduce)` in the MUI `sx` props.

**Implementation guidance:**
- For MUI `sx` props that use `animation`, you can use a media query inside `sx`:
  ```tsx
  sx={{
    animation: `${fadeIn} 0.3s ease-out`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  }}
  ```
- For CSS `transition` in inline styles (via `element.style.transition`), you'll need to check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` in JS before applying transitions.

**General principles:**
- Keep effects subtle — no excessive motion.
- Use CSS transitions/animations where possible (avoid JS-driven animation loops).
- Avoid layout shift during animations (use `transform` and `opacity` which are composited, not properties like `width`/`height`/`margin`).
- Desktop and mobile both covered.

## Done Criteria
- All animations feel smooth and subtle
- `prefers-reduced-motion` respected across all animated components
- No layout shift during transitions
- Desktop and mobile both covered
