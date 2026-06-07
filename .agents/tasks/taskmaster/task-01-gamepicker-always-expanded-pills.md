# Task 01: GamePicker pills always expanded

**File:** `components/GamePicker.tsx`
**Status:** verified

## Summary
Pills in the GamePicker sidebar currently start as 12×12 circles that expand to 120×28 pills on hover. Change them to always render at the expanded pill size with a subtle hover scale bump instead of a size transition.

## Detailed changes

### 1. Change default pill dimensions (lines 133-155)
Replace the collapsed circle defaults with the expanded pill defaults:

**Current defaults (lines 133-155):**
```tsx
sx={{
  width: 12,
  height: 12,
  borderRadius: '50%',
  bgcolor: getColor(game.slug),
  cursor: 'pointer',
  transition: 'width 0.25s ease, padding 0.25s ease, border-radius 0.25s ease',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  p: 0,
  ...(isActive && {
    border: '2px solid rgba(255,255,255,0.9)',
    transform: 'scale(1.15)',
  }),
  '&:hover': {
    width: 120,
    height: 28,
    borderRadius: 9999,
    px: 1.5,
  },
}}
```

**New defaults:**
```tsx
sx={{
  width: 'auto',
  minWidth: 120,
  height: 28,
  borderRadius: 9999,
  px: 1.5,
  bgcolor: getColor(game.slug),
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  p: 0,
  ...(isActive && {
    border: '2px solid rgba(255,255,255,0.9)',
    transform: 'scale(1.08)',
  }),
  '&:hover': {
    transform: 'scale(1.08)',
  },
}}
```

### 2. What to remove
- `overflow: 'hidden'` — no longer needed; text is always visible
- Hover width/height/borderRadius/px values — pill is already at target size
- Old transition `'width 0.25s ease, padding 0.25s ease, border-radius 0.25s ease'` — replace with `'transform 0.2s ease'`

### 3. What to add
- `width: 'auto'` — allows pill to grow with text
- `minWidth: 120` — ensures minimum width matches old hover width
- `height: 28` & `borderRadius: 9999` & `px: 1.5` — always-visible pill shape
- `transition: 'transform 0.2s ease'` — smooth scale animation on hover
- `&:hover transform: 'scale(1.08)'` — subtle hover scale bump

### 4. Active state behavior
- Active pill still gets the white border ring (`2px solid rgba(255,255,255,0.9)`)
- Active pill also uses `scale(1.08)` (same as hover, so both hover and active get the bump)
- When active + hovered: same border + scale(1.08) — effects coexist cleanly (border from base sx, scale from hover override)

### 5. Typography child (lines 157-168)
No changes needed to the `<Typography>` child. It already renders `{game.title}` with correct styling.
