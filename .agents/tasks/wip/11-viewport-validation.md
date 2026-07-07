# Task 11: Viewport Validation

## Objective
Validate UI at all specified viewports and save evidence.

## Requirements

**Prerequisite:** The dev server must be running (`bun run dev`). The radio page is at `http://localhost:3000/radio`.

### Viewports to test:
1. Desktop >= 1280px (e.g. 1280x800)
2. Mobile 360x800
3. Mobile 390x844
4. Mobile 430x932
5. Tablet 768x1024

### Validation checklist for each viewport:
- [ ] No horizontal page scroll (especially at 360px — this is the critical check)
- [ ] Interactive tap targets >= 44x44 CSS pixels (mobile viewports)
- [ ] Mobile layout matches spec from task 08:
  - Cover image + song title only above bottom bar
  - Bottom bar is a single compact row
  - Channel selector hidden
  - Volume uses overlay vertical rail (on mobile)
- [ ] Desktop layout unchanged from original (verify at >= 1280px)
- [ ] Focus states visible on keyboard-navigable elements (Tab through all interactive elements)
- [ ] No content overflow or clipping
- [ ] Text readable at all sizes (especially body text at >= 16px)
- [ ] Lore panel (when present) hidden on mobile, visible on desktop
- [ ] Lyrics panel hidden on mobile, visible on desktop

### Methodology

Use Playwright browser tools to:
1. Navigate to `http://localhost:3000/radio`
2. Resize viewport to each dimension
3. Take screenshots
4. Optionally capture accessibility snapshots

### Evidence
Save screenshots to `/tmp/agents-artifacts/`:
- Name files with viewport dimensions: `radio-360x800.png`, `radio-390x844.png`, `radio-430x932.png`, `radio-768x1024.png`, `radio-desktop-1280x800.png`
- Also save accessibility tree snapshots: `radio-360x800-snapshot.md`, etc.

### Issues
If any validation check fails:
- Document the issue in `/tmp/agents-artifacts/viewport-issues.md`
- Include the viewport, the specific failure, and a screenshot reference
- Fix the issue if possible, then re-validate that viewport
- If a fix cannot be applied (e.g., requires design decisions), flag it for human review

## Done Criteria
- All 5 viewports tested
- No horizontal scroll at 360px (critical)
- Evidence (screenshots + snapshots) saved to `/tmp/agents-artifacts/`
- Issues documented or fixed in `/tmp/agents-artifacts/viewport-issues.md`
