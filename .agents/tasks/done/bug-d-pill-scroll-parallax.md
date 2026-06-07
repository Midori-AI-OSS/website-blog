# Bug D: Pills follow scroll instead of floating at viewport center

**File to edit:** `components/GamePicker.tsx`

## Problem
The GamePicker pills are `position: fixed` at `top: 50%` with a lerp-based parallax. The current implementation tracks `window.scrollY` and applies `currentY * 0.3` as a translateY offset. This makes the pills move *with* the scroll direction — they drift downward when scrolling down, upward when scrolling up. They should rest at viewport center and only gently resist scroll motion before settling back.

## Fix

Replace the entire "Floaty parallax (lerp)" `useEffect` with a delta-based implementation.

### Delete current effect (lines 66-83):
Remove everything from the comment on line 66 (`/* ── Floaty parallax (lerp) ──────────────────────────── */`) through the effect's closing `}, []);` on line 83 (inclusive).

### Replace with this new effect:

```ts
/* ── Floaty parallax (delta) ──────────────────────────── */
useEffect(() => {
  let prevScrollY = window.scrollY;
  let offset = 0;
  let rafId: number;

  const frame = () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - prevScrollY;
    offset += delta * -0.08;
    offset *= 0.94;
    prevScrollY = currentScrollY;

    if (containerRef.current) {
      containerRef.current.style.transform = `translateY(calc(-50% + ${offset}px))`;
    }

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(rafId);
}, []);
```

### How this works:
1. **Delta tracking:** Each frame, compute the change in `window.scrollY` since the last frame. This is the scroll *direction and speed*, not absolute position.
2. **Opposite-direction offset:** `offset += delta * -0.08` — when the user scrolls down (positive delta), the pills get a small upward push (negative offset). When scrolling up, they get a small downward push.
3. **Decay back to center:** `offset *= 0.94` each frame — when scrolling stops, the offset exponentially decays to 0, settling the pills back to viewport center.
4. **Apply:** `translateY(calc(-50% + ${offset}px))` — the `-50%` keeps the pills vertically centered in the viewport. The offset adds/subtracts a few pixels of resistance.

### Remove unused `currentY` ref
After replacing the effect, the `currentY` ref (line 20: `const currentY = useRef(0);`) is no longer used. Delete it.

## Acceptance criteria
- Pills rest at viewport center when not scrolling
- Scrolling down pushes pills slightly upward (resisting the scroll)
- Scrolling up pushes pills slightly downward
- When scrolling stops, pills smoothly settle back to viewport center (~0.3s to mostly settled)
- Pills never drift far from center (the `* 0.94` decay ensures bounded offset; max offset ≈ 1.3× typical delta)
- Smooth 60fps with requestAnimationFrame, same as before
- No console errors; `containerRef.current` null-checked before style access
