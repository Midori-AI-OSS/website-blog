# Technical Decisions Summary - Blog System

**Date:** 2025-01-17  
**Status:** ✅ Complete  
**File:** `.agents/tasks/done/00-TECHNICAL-DECISIONS.md`

---

## Technology Stack

### Core Framework
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Runtime:** Bun
- **React:** 18.3.0

### Styling & UI
- **UI Library:** MUI Joy (@mui/joy@^5.0.0-beta.52)
- **CSS-in-JS:** Emotion (@emotion/react, @emotion/styled)
- **Approach:** Component-based with MUI Joy components

### Content & Markdown
- **Markdown Renderer:** react-markdown@^10.1.0
- **Front Matter Parser:** gray-matter@4.0.3
- **Front Matter Delimiter:** `+++` (custom, per project requirement)
- **Markdown Plugins:** 
  - remark-gfm@^4.0.1 (GitHub Flavored Markdown)
  - rehype-sanitize@^6.0.0 (XSS protection)

### Architecture
- **Rendering Strategy:** SSG (Static Site Generation)
- **State Management:** Props drilling + React hooks
- **Testing:** Vitest (70% coverage target)

---

## Project Structure

```
project-root/
├── app/
│   └── blog/
│       ├── page.tsx              # Blog list route (/blog)
│       └── [slug]/
│           └── page.tsx          # Blog post route (/blog/YYYY-MM-DD)
├── blog/
│   └── posts/
│       └── YYYY-MM-DD.md        # Markdown posts with +++ front matter
├── lib/
│   └── blog/
│       ├── parser.ts            # Markdown parser (Task 05)
│       └── loader.ts            # Post loader service (Task 06)
├── components/
│   └── blog/
│       ├── BlogCard.tsx         # Card component (Task 07)
│       ├── BlogList.tsx         # List with lazy loading (Task 08)
│       └── PostView.tsx         # Full post view (Task 09)
├── package.json
└── tsconfig.json
```

---

## Key Requirements

### Post Format
- **Filename:** `YYYY-MM-DD.md` (strict validation)
- **Location:** `blog/posts/` directory only
- **Front Matter:** Optional, uses `+++` delimiters

Example:
```markdown
+++
title: My Blog Post
summary: A short summary
tags: [typescript, nextjs]
cover_image: /images/cover.png
+++

# Post Content Here
```

### Features
- ✅ Lazy loading: 10 posts initially, 10 more on scroll
- ✅ Date-based sorting (newest first)
- ✅ Posts without metadata render correctly
- ✅ Card-based UI matching Big-AGI layout
- ✅ Midori AI branding/styling
- ✅ Accessibility: WCAG 2.1 Level AA

---

## Performance Targets

- **Bundle Size:** < 200 KB (first load JS)
- **Initial Load:** < 100 ms (SSG = instant)
- **Lazy Load:** < 50 ms per batch
- **Build Time:** < 30 seconds (for 50 posts)

---

## Security Measures

1. **Markdown Sanitization:** rehype-sanitize prevents XSS
2. **Filename Validation:** Regex `/^\d{4}-\d{2}-\d{2}\.md$/`
3. **Path Restriction:** Only read from `blog/posts/`
4. **Front Matter Sanitization:** Validate metadata types

---

## Reference Repositories

### Big-AGI (Technical Reference)
- **URL:** https://github.com/enricoros/big-AGI
- **Purpose:** Next.js + MUI Joy implementation patterns
- **Key Learnings:**
  - Next.js 15 App Router structure
  - MUI Joy component usage
  - TypeScript configuration
  - Card-based UI layout

### Midori AI Agents Runner (Visual Reference)
- **URL:** https://github.com/Midori-AI-OSS/Agents-Runner
- **Purpose:** Midori AI branding and visual design
- **Note:** Python project, reference for styling only

---

## Development Commands (Bun)

```bash
# Install dependencies
bun install

# Development server
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Add new dependency
bun add <package>
```

---

## Next Steps

1. ✅ **Task 00:** Technical decisions complete
2. ⏭️ **Task 01:** Clone reference repos to /tmp
3. ⏭️ **Task 02:** Analyze UI patterns from references
4. ⏭️ **Task 03:** Setup project structure
5. ⏭️ **Task 04:** Install dependencies (see section 8 in decisions file)

---

## Notes

- All decisions documented and approved
- Stack chosen based on Big-AGI reference (proven, modern)
- MUI Joy provides accessible components out-of-the-box
- TypeScript strict mode for maximum type safety
- Bun for fast development and package management
- SSG provides best performance for static blog content

**Ready to proceed with implementation! 🚀**
