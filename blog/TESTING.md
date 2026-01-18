# Blog System Testing Guide

This document provides comprehensive testing procedures for the blog system, including keyboard navigation, accessibility audits, and browser testing.

## Table of Contents

1. [Keyboard Navigation Testing](#keyboard-navigation-testing)
2. [Accessibility Audit](#accessibility-audit)
3. [Browser & Device Testing](#browser--device-testing)
4. [Performance Testing](#performance-testing)
5. [Unit Testing](#unit-testing)

---

## Keyboard Navigation Testing

### Overview
All interactive elements should be accessible via keyboard for users who cannot use a mouse or prefer keyboard navigation.

### Test Procedure

#### 1. Blog List Page (`/blog`)

**Tab Navigation:**
- [ ] Press `Tab` repeatedly - focus should move through interactive elements in logical order:
  1. Browser address bar/UI
  2. First blog card
  3. Second blog card
  4. Third blog card
  5. Continue through all visible cards
  6. "Load more" trigger area (when applicable)

**Visual Feedback:**
- [ ] Each focused element should have a visible focus indicator (outline)
- [ ] Focus indicator should be clearly visible against all backgrounds
- [ ] Focus indicator color should meet contrast requirements (see Accessibility section)

**Card Interaction:**
- [ ] With a card focused, press `Enter` → should open the full post view
- [ ] With a card focused, press `Space` → should open the full post view
- [ ] Both keys should work identically

**Expected Behavior:**
- No focus traps (can tab through everything)
- No invisible focus (always know where you are)
- Logical tab order (left-to-right, top-to-bottom)

#### 2. Full Post View (`/blog/[slug]`)

**Navigation:**
- [ ] Press `Escape` → should return to blog list
- [ ] Tab to "Back to posts" button → press `Enter` → should return to blog list
- [ ] Tab through all links in the content → should be able to activate with `Enter`

**Scroll Navigation:**
- [ ] Tab to "Back to top" button → press `Enter` → should scroll to top
- [ ] Tab to "Back to posts" button (footer) → press `Enter` → should return to list

**Expected Behavior:**
- `Escape` key works from anywhere on the page
- All buttons respond to both mouse and keyboard
- Links in markdown content are keyboard accessible

#### 3. Focus Management

**After Navigation:**
- [ ] After opening a post, focus should move to a logical starting point (not lost)
- [ ] After returning to list, focus should return to previously focused card (or to top)

**During Loading:**
- [ ] While loading more posts, keyboard focus should remain stable
- [ ] New content should not steal focus

### Keyboard Shortcuts Summary

| Action | Key(s) | Context |
|--------|--------|---------|
| Navigate between elements | `Tab` | All pages |
| Navigate backwards | `Shift + Tab` | All pages |
| Activate button/link | `Enter` or `Space` | Focused element |
| Open blog post | `Enter` or `Space` | Focused card |
| Close post view | `Escape` | Post view |
| Scroll to top | `Enter` on button | Post view |

### Common Issues to Watch For

- Focus traps (can't tab out of a section)
- Lost focus (focus disappears after an action)
- Invisible focus (no visual indicator)
- Wrong tab order (jumps around illogically)
- Some elements respond to `Enter` but not `Space` (or vice versa)

---

## Accessibility Audit

### Automated Testing with Lighthouse

#### Prerequisites
- Chrome or Chromium-based browser
- Development server running (`npm run dev` or `npm run build && npm start`)

#### Procedure

1. **Open Chrome DevTools:**
   - Press `F12` or right-click → "Inspect"
   - Navigate to the "Lighthouse" tab

2. **Configure Audit:**
   - Select "Accessibility" category
   - Choose "Desktop" or "Mobile" device
   - Click "Analyze page load"

3. **Review Results:**
   - Target score: **90+** (excellent accessibility)
   - Review any warnings or errors
   - Follow suggested fixes

4. **Test Multiple Pages:**
   - Blog list: `http://localhost:3000/blog`
   - Blog post: `http://localhost:3000/blog/2026-01-18` (use any valid slug)
   - Home page: `http://localhost:3000`

#### Key Metrics to Check

- [ ] **Color Contrast:** All text meets WCAG 2.1 AA standards (4.5:1 for body, 3:1 for large text)
- [ ] **ARIA Attributes:** Proper use of roles, labels, and live regions
- [ ] **Keyboard Navigation:** All interactive elements are keyboard accessible
- [ ] **Image Alt Text:** All images have descriptive alt text
- [ ] **Semantic HTML:** Proper use of headings, landmarks, lists
- [ ] **Focus Indicators:** Visible focus states on all interactive elements

### Manual Testing with Screen Readers

#### macOS - VoiceOver

```bash
# Enable VoiceOver
CMD + F5

# Navigate
VO + Arrow Keys    # Read next/previous
VO + Space         # Activate element
VO + U             # Open rotor (navigation menu)
```

**Test Checklist:**
- [ ] All blog cards are announced with title and summary
- [ ] Dates are read correctly (not as "2026 minus 01 minus 18")
- [ ] Tags are announced appropriately
- [ ] Loading states are announced ("Loading more posts")
- [ ] Error messages are announced immediately (ARIA live regions)
- [ ] Post content is readable in logical order

#### Windows - NVDA (Free)

Download: https://www.nvaccess.org/download/

```
# Basic Navigation
Down Arrow         # Read next line
NVDA + Down        # Read all
Tab                # Next interactive element
```

#### Testing Script

1. Navigate to blog list
2. Use reading commands to hear each card's information
3. Navigate to a card with Tab
4. Activate card with Enter
5. Listen to post content being read
6. Return to list with Escape
7. Verify loading announcements work when scrolling

### WCAG 2.1 AA Compliance Checklist

- [ ] **1.1.1 Non-text Content:** All images have alt text
- [ ] **1.3.1 Info and Relationships:** Semantic HTML (headings, lists, etc.)
- [ ] **1.4.3 Contrast (Minimum):** Text contrast ratio ≥ 4.5:1
- [ ] **2.1.1 Keyboard:** All functionality via keyboard
- [ ] **2.1.2 No Keyboard Trap:** Can navigate away from all elements
- [ ] **2.4.3 Focus Order:** Logical tab order
- [ ] **2.4.7 Focus Visible:** Visible focus indicators
- [ ] **3.2.2 On Input:** No unexpected context changes
- [ ] **4.1.2 Name, Role, Value:** Proper ARIA attributes

---

## Browser & Device Testing

### Desktop Browsers (Minimum Required)

#### Chrome/Chromium
- [ ] **Version:** Latest stable
- [ ] Blog list loads correctly
- [ ] Cards display in responsive grid
- [ ] Infinite scroll works
- [ ] Post view renders markdown correctly
- [ ] Images lazy load
- [ ] No console errors

#### Firefox
- [ ] **Version:** Latest stable
- [ ] Same tests as Chrome
- [ ] Verify MDN-specific CSS features work
- [ ] Check Web Extension compatibility (if any)

#### Safari (macOS only)
- [ ] **Version:** Latest stable
- [ ] Same tests as Chrome
- [ ] Check webkit-specific styles
- [ ] Verify mobile Safari behavior (responsive mode)

#### Optional: Edge
- [ ] **Version:** Latest stable
- [ ] Should work identically to Chrome (Chromium-based)

### Mobile Devices

#### iOS Safari (iPhone/iPad)
- [ ] Portrait and landscape orientations
- [ ] Touch scrolling is smooth
- [ ] Cards are tappable with appropriate touch targets (≥44x44px)
- [ ] Pinch-to-zoom works (if applicable)
- [ ] No horizontal scrolling issues
- [ ] Images load and display correctly

#### Android Chrome
- [ ] Same tests as iOS
- [ ] Test on at least one device with small screen (≤375px width)
- [ ] Test on at least one device with large screen (≥768px width)

### Testing Tools

#### Browser DevTools Device Emulation
1. Open DevTools (`F12`)
2. Click device toolbar icon or press `Ctrl+Shift+M` (Windows) / `Cmd+Shift+M` (Mac)
3. Select device presets:
   - iPhone SE (375px width)
   - iPhone 12 Pro (390px width)
   - iPad (768px width)
   - Desktop (1920px width)

#### Responsive Breakpoints to Test

```css
/* As defined in BlogList.tsx */
xs: 1 column  (< 600px)   /* Mobile */
sm: 2 columns (600-899px) /* Tablet portrait */
lg: 3 columns (≥ 900px)   /* Desktop */
```

**Test at:**
- [ ] 375px (Mobile - iPhone SE)
- [ ] 390px (Mobile - iPhone 12)
- [ ] 768px (Tablet - iPad)
- [ ] 1024px (Desktop - small)
- [ ] 1920px (Desktop - large)

### Cross-Browser Issues to Watch For

#### Common Issues
- [ ] CSS Grid layout differences
- [ ] Flexbox wrapping behavior
- [ ] Custom font loading
- [ ] Image aspect ratios
- [ ] Intersection Observer support (infinite scroll)
- [ ] Scroll behavior (smooth scrolling)

#### Browser-Specific Bugs
- **Safari:** May have issues with `backdrop-filter`
- **Firefox:** May render web fonts differently
- **Mobile Safari:** May have touch event handling differences
- **Older browsers:** Check caniuse.com for feature support

---

## Performance Testing

### Lighthouse Performance Audit

1. Open DevTools → Lighthouse
2. Select "Performance" category
3. Run audit
4. Target scores:
   - **Performance:** ≥90
   - **Best Practices:** ≥90
   - **SEO:** ≥90

### Key Metrics

- [ ] **First Contentful Paint (FCP):** < 1.8s
- [ ] **Largest Contentful Paint (LCP):** < 2.5s
- [ ] **Cumulative Layout Shift (CLS):** < 0.1
- [ ] **Time to Interactive (TTI):** < 3.8s
- [ ] **Total Blocking Time (TBT):** < 200ms

### Bundle Size Verification

```bash
# Build and check bundle sizes
npm run build

# Look for route sizes in output:
# Target: Individual pages < 500KB First Load JS
# Current: /blog/[slug] = ~186KB ✓
```

### Runtime Performance

#### Chrome DevTools Performance Tab
1. Record page interaction
2. Scroll through blog list
3. Open a post
4. Check for:
   - [ ] No layout thrashing
   - [ ] No long tasks (> 50ms)
   - [ ] Smooth 60fps scrolling
   - [ ] Minimal re-renders (React DevTools Profiler)

---

## Unit Testing

### Running Tests

#### Prerequisites
The project tests are written for Bun's test runner. Install Bun:

```bash
# macOS, Linux, WSL
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

#### Run Tests

```bash
# Run all tests
npm run test:bun

# Or directly with Bun
bun test

# Run specific test file
bun test lib/blog/parser.test.ts

# Run with coverage
bun test --coverage
```

### Test Coverage

#### Current Test Files
- `lib/blog/parser.test.ts` - Markdown parsing logic
- `lib/blog/loader.test.ts` - Blog post loading logic  
- `components/blog/BlogList.test.tsx` - BlogList component

#### Expected Coverage
- [ ] Parser functions: 100%
- [ ] Loader functions: 100%
- [ ] BlogList component: ≥ 80%

#### Writing New Tests
Follow the existing test patterns:
- Use `describe` blocks for grouping
- Use `test` for individual test cases
- Use `expect` for assertions
- Mock external dependencies (filesystem, fetch)

---

## Automated Testing Checklist

Use this checklist before deploying:

### Pre-Deployment
- [ ] `npm run build` succeeds without errors
- [ ] `bun test` passes all unit tests
- [ ] Lighthouse accessibility score ≥90 on all pages
- [ ] Lighthouse performance score ≥90 on all pages
- [ ] Tested on Chrome and Firefox (latest)
- [ ] Tested on mobile (iOS Safari or Android Chrome)
- [ ] No console errors in browser DevTools
- [ ] All images have alt text
- [ ] All interactive elements have visible focus indicators
- [ ] Keyboard navigation works on all pages
- [ ] Screen reader announces content correctly (spot check)

### Post-Deployment
- [ ] Smoke test on production URL
- [ ] Verify static generation worked (check page source)
- [ ] Check CDN/hosting is serving files correctly
- [ ] Monitor for runtime errors (Sentry, etc.)

---

## Issue Reporting Template

When reporting a bug found during testing:

```markdown
**Browser/Device:** Chrome 120 on Windows 11
**Page:** /blog
**Steps to Reproduce:**
1. Navigate to /blog
2. Tab through cards
3. Press Enter on third card

**Expected:** Post opens
**Actual:** Nothing happens

**Console Errors:** [paste any errors]
**Screenshot:** [if applicable]
**Severity:** High / Medium / Low
```

---

## Resources

### Tools
- **Lighthouse:** Built into Chrome DevTools
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/
- **NVDA Screen Reader:** https://www.nvaccess.org/
- **VoiceOver:** Built into macOS

### Documentation
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Accessibility:** https://developer.mozilla.org/en-US/docs/Web/Accessibility
- **Next.js Docs:** https://nextjs.org/docs
- **MUI Joy Docs:** https://mui.com/joy-ui/getting-started/

### Learning
- **WebAIM:** https://webaim.org/
- **A11y Project:** https://www.a11yproject.com/
- **Google Web Fundamentals:** https://developers.google.com/web/fundamentals/accessibility
