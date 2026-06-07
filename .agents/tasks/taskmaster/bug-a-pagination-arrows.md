# Bug A: Pagination arrows not aligned

**File to edit:** `app/lore/LoreListPageClient.tsx`

## Problem
HTML entities `&#8592;` (←) and `&#8594;` (→) rendered inside 32×32 Box buttons look visually misaligned against the 8px page dots in the pagination bar. The arrow glyphs are not vertically centered and the button boxes are too large relative to the dot indicators.

## Fix
1. **Add import** at the top of the file (line 3 area, near the existing `@mui/joy` imports):
   ```
   import { ChevronLeft, ChevronRight } from 'lucide-react';
   ```
   lucide-react is already a project dependency, used in `components/blog/PostView.tsx`.

2. **Left arrow button** (lines ~516-518): Replace the `&#8592;` text content with:
   ```tsx
   <ChevronLeft size={20} strokeWidth={2} />
   ```

3. **Right arrow button** (lines ~597-599): Replace the `&#8594;` text content with:
   ```tsx
   <ChevronRight size={20} strokeWidth={2} />
   ```

4. **Resize button boxes** from 32×32 to 28×28:
   - In the left arrow button `sx` (lines 499-500): change `width: 32` → `width: 28` and `height: 32` → `height: 28`
   - In the right arrow button `sx` (lines 578-579): change `width: 32` → `width: 28` and `height: 32` → `height: 28`

5. The existing `display: 'flex'`, `alignItems: 'center'`, `justifyContent: 'center'` will center the lucide icon within the smaller box.

## Acceptance criteria
- Arrows render as consistent 20px lucide-react icons, vertically centered in 28×28 boxes
- Visual balance against 8px page dots is improved
- Hover color change (`#8b5cf6`) still works on both arrows
- Disabled state styling still applies correctly
