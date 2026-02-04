# Task: Desktop review in Firefox (PixelArch)

**Scope:** Manual QA only (no code changes expected)

## Goal
Use the desktop environment to visually verify the Lore ordering + Blog/Lore tag filter UI in Firefox. Save any screenshots/logs to `/tmp/agents-artifacts`.

## Steps
1. Ensure artifacts directory exists:
   - `mkdir -p /tmp/agents-artifacts`
2. Ensure Firefox is installed (PixelArch):
   - `command -v firefox || yay -Syu firefox`
3. Run the app:
   - `bun install`
   - `bun run dev`
4. In Firefox, verify:
   - `http://localhost:3000/lore` shows newest-first ordering.
   - `http://localhost:3000/blog` tag filter UI works (select/clear; multi-select).
   - Infinite scroll respects filtering on both pages.
5. Save evidence:
   - Screenshots: `/tmp/agents-artifacts/blog-filter.png`, `/tmp/agents-artifacts/lore-filter.png`, `/tmp/agents-artifacts/lore-order.png`
   - Any notes: `/tmp/agents-artifacts/qa-notes.txt`

## Acceptance Criteria
- Visual confirmation of correct ordering and filtering behavior in Firefox.
- Artifacts are saved under `/tmp/agents-artifacts/`.

## Notes
- If you find a bug that requires code changes, create a *new* task + commit (don’t bundle fixes into this QA task).

