# Task: Test Blog Functionality

## Objective
Verify all blog functionality works according to acceptance criteria.

## Prerequisites
- All previous tasks completed (01-11)
- Dev server can be started

## Acceptance Checks

### 1. New Post Without Code Changes
- [ ] Add `blog/posts/2026-01-18.md`
- [ ] Refresh blog page
- [ ] Verify new post appears as newest card
- [ ] No code rebuild required

### 2. Sorting
- [ ] Verify posts display newest-to-oldest
- [ ] Check first post is most recent date
- [ ] Check last post is oldest date

### 3. Lazy Loading (>10 posts)
- [ ] Initially only 10 posts render
- [ ] Scroll to bottom
- [ ] More posts load (next 10)
- [ ] Continue until all posts loaded
- [ ] Loading indicator works

### 4. Posts Without Metadata
- [ ] Plain markdown posts render correctly
- [ ] Title defaults to filename date
- [ ] No errors for missing summary
- [ ] Card displays properly

### 5. Full Post View
- [ ] Click any card
- [ ] Full post view opens
- [ ] Markdown renders correctly
- [ ] Back button returns to list
- [ ] Can open multiple posts sequentially

### 6. Styling
- [ ] Layout matches Big-AGI reference
- [ ] Colors/style match Agents-Runner
- [ ] Uses existing UI components
- [ ] Responsive on mobile/tablet/desktop

## Test Script
```bash
# Start dev server
bun run dev

# Open blog page in browser:
# http://localhost:3000/blog (or appropriate port)

# Perform all acceptance checks below
# Document any issues in "Issues Found" section at bottom
```

## Automated Testing (Recommended)

If test framework chosen in technical decisions:

```bash
# Unit tests for parser and loader
bun test

# E2E tests (if Playwright/Cypress configured)
bun run test:e2e
```

**Example E2E test (Playwright):**
```typescript
test('blog pagination works', async ({ page }) => {
  await page.goto('/blog');
  
  // Should show 10 posts initially
  const cards = await page.locator('.blog-card').count();
  expect(cards).toBe(10);
  
  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  
  // Should load more posts
  const newCards = await page.locator('.blog-card').count();
  expect(newCards).toBeGreaterThan(10);
});

test('can open and close post', async ({ page }) => {
  await page.goto('/blog');
  await page.locator('.blog-card').first().click();
  
  // Should navigate to post page
  expect(page.url()).toContain('/blog/2026-');
  
  // Should show full post
  await expect(page.locator('article')).toBeVisible();
  
  // Click back
  await page.locator('text=Back to posts').click();
  expect(page.url()).toContain('/blog');
});
```

## Success Criteria
- [ ] All 6 acceptance checks pass
- [ ] No console errors in browser
- [ ] No console warnings (or documented/acceptable)
- [ ] Smooth performance (no lag, no jank)
- [ ] Good user experience (intuitive, responsive)
- [ ] Automated tests pass (if implemented)
- [ ] All error states tested (empty posts, load failures)
- [ ] Accessibility tested (keyboard nav, screen reader)

## Issues Found
(Document any issues here during testing)
