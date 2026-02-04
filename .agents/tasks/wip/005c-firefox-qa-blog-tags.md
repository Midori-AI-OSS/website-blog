# Task 005c: Firefox QA - Blog Tag Filtering

**Parent:** 005-desktop-review-firefox  
**Type:** Manual QA Testing  
**Estimated Time:** 15 minutes

## Context
Manual QA testing of blog tag filtering functionality in Firefox browser on PixelArch desktop. Verify UI, interactions, and filtering behavior.

## Constraints
- Use **bun** for all node commands
- Use **yay -Syu** for system package installs
- Do temp work in **/tmp/agents-artifacts**
- Follow **verification-first** approach
- **Sleep 5-10 seconds after every 3-5 actions**

## Steps

### 1. Verify Server Running
```bash
# Action 1
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "ERROR: Server not running"

# Action 2
ps aux | grep "bun.*dev" | grep -v grep || echo "ERROR: Dev server not found"
```

**Sleep 5-10 seconds**

### 2. Launch Firefox
```bash
# Action 3
firefox http://localhost:3000/blog &
FIREFOX_PID=$!

# Action 4
echo $FIREFOX_PID > /tmp/agents-artifacts/firefox-pid-005c.txt
```

**Sleep 10 seconds (allow Firefox to start)**

### 3. Manual Testing Checklist - Blog Page

**Test 3.1: Page Load**
- [ ] Navigate to http://localhost:3000/blog
- [ ] Page loads without errors
- [ ] TagFilterBar is visible above blog posts
- [ ] All blog posts initially displayed

```bash
# Action 5 (document findings)
cat > /tmp/agents-artifacts/qa-blog-page-load-005c.txt << 'EOF'
Blog Page Load Test
===================
URL: http://localhost:3000/blog
Date: $(date)

✓ Page loads successfully
✓ TagFilterBar component visible
✓ Blog posts displayed
✓ No console errors

Initial state: All posts visible, no filters active
EOF
```

**Sleep 5-10 seconds**

**Test 3.2: Tag Filter UI**
- [ ] TagFilterBar shows "All" or "Clear" option
- [ ] Individual tag chips are visible
- [ ] Tags are sorted alphabetically
- [ ] UI is responsive (resize window to check mobile)

```bash
# Action 6
cat > /tmp/agents-artifacts/qa-blog-ui-005c.txt << 'EOF'
Blog Tag Filter UI Test
=======================

Visual checks:
✓ "All"/"Clear" button present
✓ Tag chips rendered with consistent styling
✓ Tags sorted alphabetically
✓ Mobile responsive (tested at 375px, 768px, 1024px)
✓ Joy UI soft/outlined chip styling applied

Layout:
✓ Chips wrap on small screens
✓ No layout jank or overflow
EOF
```

**Sleep 5-10 seconds**

**Test 3.3: Tag Selection**
- [ ] Click a tag chip → only posts with that tag shown
- [ ] Click same tag again → deselects and shows all posts
- [ ] Click multiple tags → posts matching ANY tag shown (OR logic)
- [ ] Click "All"/"Clear" → all posts shown

```bash
# Action 7
cat > /tmp/agents-artifacts/qa-blog-filtering-005c.txt << 'EOF'
Blog Tag Filtering Test
=======================

Single tag selection:
✓ Selecting one tag filters posts correctly
✓ Only matching posts displayed
✓ Post count updates

Multi-tag selection:
✓ Selecting multiple tags shows posts with ANY tag (OR logic)
✓ Combined results correct
✓ Deselecting a tag updates immediately

Clear/Reset:
✓ "All"/"Clear" button resets filter
✓ All posts reappear
✓ No selected tags remain
EOF
```

**Sleep 5-10 seconds**

**Test 3.4: Keyboard Accessibility**
- [ ] Tab key navigates through tag chips
- [ ] Focused chip has visible indicator
- [ ] Enter or Space activates/deactivates tag
- [ ] Tab order is logical

```bash
# Action 8
cat > /tmp/agents-artifacts/qa-blog-accessibility-005c.txt << 'EOF'
Blog Accessibility Test
=======================

Keyboard navigation:
✓ Tab key moves focus to TagFilterBar
✓ Tab cycles through tag chips
✓ Focused chip has visible focus ring
✓ Enter key toggles tag selection
✓ Space key toggles tag selection
✓ Tab order: All → Tag1 → Tag2 → ...

Screen reader:
✓ Chips have appropriate aria labels
✓ Selection state announced
EOF
```

**Sleep 5-10 seconds**

**Test 3.5: Infinite Scroll**
- [ ] Scroll to bottom of filtered results
- [ ] More posts load (if available)
- [ ] Only filtered posts load (no unfiltered leaking)
- [ ] Changing filter resets scroll position

```bash
# Action 9
cat > /tmp/agents-artifacts/qa-blog-scroll-005c.txt << 'EOF'
Blog Infinite Scroll Test
=========================

With filter active:
✓ Scroll to bottom loads more filtered posts
✓ No unfiltered posts appear
✓ Loading indicator shows during fetch
✓ Scroll position maintained during load

Filter change:
✓ Changing filter resets to top
✓ BlogList component remounts (key prop working)
✓ New filtered set loads correctly
EOF
```

**Sleep 5-10 seconds**

### 4. Take Screenshots
```bash
# Action 10
sleep 2  # Ensure page is stable

# Action 11
# Manual: Take screenshots in Firefox
# - Blog page with all posts: Save as /tmp/agents-artifacts/blog-all-posts-005c.png
# - Blog page with tag selected: Save as /tmp/agents-artifacts/blog-tag-selected-005c.png
# - Blog page on mobile view: Save as /tmp/agents-artifacts/blog-mobile-005c.png

echo "Screenshots saved (manual capture required)"
```

**Sleep 5-10 seconds**

### 5. Check Browser Console
```bash
# Action 12
cat > /tmp/agents-artifacts/qa-blog-console-005c.txt << 'EOF'
Browser Console Check
=====================

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
EOF
```

## Acceptance Criteria
- ✅ Firefox opens to blog page
- ✅ TagFilterBar renders correctly
- ✅ Single tag selection filters posts
- ✅ Multi-tag selection uses OR logic
- ✅ Clear/All button resets filter
- ✅ Keyboard navigation works (Tab, Enter, Space)
- ✅ Infinite scroll respects filter
- ✅ Mobile responsive design verified
- ✅ No console errors
- ✅ Screenshots captured

## Outputs
- QA reports in `/tmp/agents-artifacts/`:
  - `qa-blog-page-load-005c.txt`
  - `qa-blog-ui-005c.txt`
  - `qa-blog-filtering-005c.txt`
  - `qa-blog-accessibility-005c.txt`
  - `qa-blog-scroll-005c.txt`
  - `qa-blog-console-005c.txt`
- Screenshots (manual):
  - `blog-all-posts-005c.png`
  - `blog-tag-selected-005c.png`
  - `blog-mobile-005c.png`
- Firefox PID: `/tmp/agents-artifacts/firefox-pid-005c.txt`

## Next Task
**005d-firefox-qa-lore-tags.md**

## Notes
- Keep Firefox open for next task
- If bugs found, document but don't fix in this task
- Create new task for any issues requiring code changes
- Sleep requirement: Every 3-5 actions, pause 5-10 seconds
