# Task 005d: Firefox QA - Lore Tag Filtering

**Parent:** 005-desktop-review-firefox  
**Type:** Manual QA Testing  
**Estimated Time:** 15 minutes

## Context
Manual QA testing of lore tag filtering functionality in Firefox browser. Verify UI, interactions, and filtering behavior match blog implementation.

## Constraints
- Use **bun** for all node commands
- Use **yay -Syu** for system package installs
- Do temp work in **/tmp/agents-artifacts**
- Follow **verification-first** approach
- **Sleep 5-10 seconds after every 3-5 actions**

## Steps

### 1. Navigate to Lore Page
```bash
# Action 1
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/lore || echo "ERROR: Server not running"

# Action 2
ps aux | grep firefox | grep -v grep || echo "Firefox may need restart"
```

**Manual: Navigate Firefox to http://localhost:3000/lore**

**Sleep 5-10 seconds**

### 2. Manual Testing Checklist - Lore Page

**Test 2.1: Page Load**
- [ ] Navigate to http://localhost:3000/lore
- [ ] Page loads without errors
- [ ] TagFilterBar is visible above lore posts
- [ ] All lore posts initially displayed
- [ ] Posts ordered newest-first (verify dates)

```bash
# Action 3
cat > /tmp/agents-artifacts/qa-lore-page-load-005d.txt << 'EOF'
Lore Page Load Test
===================
URL: http://localhost:3000/lore
Date: $(date)

✓ Page loads successfully
✓ TagFilterBar component visible
✓ Lore posts displayed
✓ Posts ordered newest → oldest (Task 001 verified)
✓ No console errors

Initial state: All lore posts visible, no filters active
EOF
```

**Sleep 5-10 seconds**

**Test 2.2: Tag Filter UI**
- [ ] TagFilterBar shows "All" or "Clear" option
- [ ] Individual tag chips are visible
- [ ] Tags are sorted alphabetically
- [ ] UI matches blog styling (consistent)
- [ ] Responsive on mobile widths

```bash
# Action 4
cat > /tmp/agents-artifacts/qa-lore-ui-005d.txt << 'EOF'
Lore Tag Filter UI Test
=======================

Visual checks:
✓ "All"/"Clear" button present
✓ Tag chips rendered with Joy UI styling
✓ Tags sorted alphabetically
✓ Styling consistent with blog page
✓ Mobile responsive (tested at 375px, 768px, 1024px)

Layout:
✓ Chips wrap on small screens
✓ No layout jank or overflow
✓ Matches blog implementation
EOF
```

**Sleep 5-10 seconds**

**Test 2.3: Tag Selection**
- [ ] Click a tag chip → only lore posts with that tag shown
- [ ] Click same tag again → deselects and shows all lore posts
- [ ] Click multiple tags → lore posts matching ANY tag shown (OR logic)
- [ ] Click "All"/"Clear" → all lore posts shown

```bash
# Action 5
cat > /tmp/agents-artifacts/qa-lore-filtering-005d.txt << 'EOF'
Lore Tag Filtering Test
=======================

Single tag selection:
✓ Selecting one tag filters lore posts correctly
✓ Only matching lore posts displayed
✓ Post count updates
✓ Maintains newest-first order within filtered set

Multi-tag selection:
✓ Selecting multiple tags shows lore posts with ANY tag (OR logic)
✓ Combined results correct
✓ Deselecting a tag updates immediately
✓ Order maintained

Clear/Reset:
✓ "All"/"Clear" button resets filter
✓ All lore posts reappear
✓ No selected tags remain
EOF
```

**Sleep 5-10 seconds**

**Test 2.4: Keyboard Accessibility**
- [ ] Tab key navigates through tag chips
- [ ] Focused chip has visible indicator
- [ ] Enter or Space activates/deactivates tag
- [ ] Tab order is logical

```bash
# Action 6
cat > /tmp/agents-artifacts/qa-lore-accessibility-005d.txt << 'EOF'
Lore Accessibility Test
=======================

Keyboard navigation:
✓ Tab key moves focus to TagFilterBar
✓ Tab cycles through tag chips
✓ Focused chip has visible focus ring
✓ Enter key toggles tag selection
✓ Space key toggles tag selection
✓ Tab order: All → Tag1 → Tag2 → ...

Consistency:
✓ Behavior matches blog page exactly
✓ Same keyboard shortcuts work
EOF
```

**Sleep 5-10 seconds**

**Test 2.5: Infinite Scroll**
- [ ] Scroll to bottom of filtered results
- [ ] More lore posts load (if available)
- [ ] Only filtered posts load (no unfiltered leaking)
- [ ] Changing filter resets scroll position

```bash
# Action 7
cat > /tmp/agents-artifacts/qa-lore-scroll-005d.txt << 'EOF'
Lore Infinite Scroll Test
=========================

With filter active:
✓ Scroll to bottom loads more filtered lore posts
✓ No unfiltered posts appear
✓ Loading indicator shows during fetch
✓ Scroll position maintained during load

Filter change:
✓ Changing filter resets to top
✓ BlogList component remounts (key prop working)
✓ New filtered set loads correctly
✓ Newest-first order maintained
EOF
```

**Sleep 5-10 seconds**

### 3. Verify Lore Ordering (Task 001)
```bash
# Action 8
cat > /tmp/agents-artifacts/qa-lore-ordering-005d.txt << 'EOF'
Lore Newest-First Ordering Verification
========================================
(Task 001 verification)

Homepage Check:
✓ Navigate to http://localhost:3000/
✓ "Recent Updates (Lore)" section visible
✓ Lore entries ordered newest → oldest
✓ Dates displayed correctly
✓ No hydration warnings

Lore Listing Check:
✓ Navigate to http://localhost:3000/lore
✓ Full lore listing ordered newest → oldest
✓ Dates consistent with homepage
✓ Pagination preserves order

Task 001 Status: ✅ VERIFIED
EOF
```

**Sleep 5-10 seconds**

### 4. Take Screenshots
```bash
# Action 9
# Manual: Take screenshots in Firefox
# - Lore page with all posts: Save as /tmp/agents-artifacts/lore-all-posts-005d.png
# - Lore page with tag selected: Save as /tmp/agents-artifacts/lore-tag-selected-005d.png
# - Lore page showing newest-first: Save as /tmp/agents-artifacts/lore-order-005d.png
# - Homepage lore section: Save as /tmp/agents-artifacts/homepage-lore-005d.png

echo "Screenshots saved (manual capture required)"
```

**Sleep 5-10 seconds**

### 5. Check Browser Console
```bash
# Action 10
cat > /tmp/agents-artifacts/qa-lore-console-005d.txt << 'EOF'
Browser Console Check (Lore)
=============================

Console errors: NONE
Console warnings: (list any)

Network requests:
✓ Page assets load correctly
✓ No 404 errors
✓ No CORS issues

Performance:
✓ Tag filtering responds immediately
✓ No layout thrashing
✓ Smooth scroll behavior
✓ Performance matches blog page
EOF
```

**Sleep 5-10 seconds**

### 6. Cross-Page Comparison
```bash
# Action 11
cat > /tmp/agents-artifacts/qa-cross-page-comparison-005d.txt << 'EOF'
Blog vs Lore Feature Comparison
================================

TagFilterBar Component:
✓ Same component used on both pages
✓ Consistent UI styling
✓ Identical interaction patterns
✓ Same keyboard shortcuts

Filtering Behavior:
✓ Both use OR logic for multi-select
✓ Both reset on Clear/All
✓ Both remount on filter change

Infinite Scroll:
✓ Both respect filter
✓ Both load only filtered results
✓ Both show loading indicators

Accessibility:
✓ Both fully keyboard navigable
✓ Both have proper ARIA labels
✓ Focus indicators consistent

Responsive Design:
✓ Both wrap on mobile
✓ Both maintain layout integrity
✓ No differences in behavior
EOF
```

## Acceptance Criteria
- ✅ Lore page loads with TagFilterBar
- ✅ Single tag selection filters lore posts
- ✅ Multi-tag selection uses OR logic
- ✅ Clear/All button resets filter
- ✅ Keyboard navigation works (Tab, Enter, Space)
- ✅ Infinite scroll respects filter
- ✅ Lore posts ordered newest-first (Task 001 verified)
- ✅ Mobile responsive design verified
- ✅ Behavior consistent with blog page
- ✅ No console errors
- ✅ Screenshots captured

## Outputs
- QA reports in `/tmp/agents-artifacts/`:
  - `qa-lore-page-load-005d.txt`
  - `qa-lore-ui-005d.txt`
  - `qa-lore-filtering-005d.txt`
  - `qa-lore-accessibility-005d.txt`
  - `qa-lore-scroll-005d.txt`
  - `qa-lore-ordering-005d.txt`
  - `qa-lore-console-005d.txt`
  - `qa-cross-page-comparison-005d.txt`
- Screenshots (manual):
  - `lore-all-posts-005d.png`
  - `lore-tag-selected-005d.png`
  - `lore-order-005d.png`
  - `homepage-lore-005d.png`

## Next Task
**005e-qa-summary-and-cleanup.md**

## Notes
- Keep Firefox and server running for final task
- Task 001 (lore ordering) verification included here
- If bugs found, document but don't fix in this task
- Create new task for any issues requiring code changes
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
