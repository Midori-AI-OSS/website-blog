# Task: Install Required Dependencies

## Objective
Install necessary dependencies for markdown parsing, front matter extraction, and routing.

## Prerequisites
- **REQUIRED:** `00-TECHNICAL-DECISIONS.md` completed
- Know: Framework, styling approach, exact dependency versions
- Task 03 completed (project initialized)

## Required Dependencies
**⚠️ IMPORTANT:** Use exact versions from `00-TECHNICAL-DECISIONS.md` section 8.

### Core Dependencies:
1. Markdown parser: `marked` OR `markdown-it` (decision required)
2. Front matter parser: `gray-matter`
3. Framework dependencies (if not installed)
4. Routing library (if needed)
5. Styling dependencies (based on decision)
6. Security: DOMPurify for HTML sanitization

## Steps

### 1. Install Core Dependencies
```bash
# Markdown and front matter (adjust versions from technical decisions)
bun add marked@11.1.1 gray-matter@4.0.3

# Security - HTML sanitization (REQUIRED)
bun add isomorphic-dompurify
```

### 2. Install Framework Dependencies (if needed)
```bash
# For Vite + React (skip if using Next.js)
bun add react@18.2.0 react-dom@18.2.0

# For React Router (skip if using Next.js)
bun add react-router-dom@6.21.1
```

### 3. Install Styling Dependencies (based on technical decisions)
```bash
# Example for Tailwind CSS:
# bun add -d tailwindcss postcss autoprefixer
# bunx tailwindcss init -p

# Example for CSS Modules:
# (usually built-in, no extra deps)

# Example for Styled Components:
# bun add styled-components
# bun add -d @types/styled-components
```

### 4. Install TypeScript Types (if using TypeScript)
```bash
bun add -d @types/marked @types/react @types/react-dom
bun add -d @types/node  # For filesystem operations
```

### 5. Verify Installation
```bash
# Check all dependencies installed
bun pm ls

# Test imports
bun run --eval "import('marked'); import('gray-matter'); console.log('✓ Dependencies OK')"
```

## Success Criteria
- [ ] Markdown parser installed (marked or markdown-it)
- [ ] Front matter parser (gray-matter) installed
- [ ] DOMPurify installed for security
- [ ] Framework dependencies installed (if needed)
- [ ] Routing library installed (if needed)
- [ ] Styling dependencies installed (from technical decisions)
- [ ] TypeScript types installed (if using TypeScript)
- [ ] All dependencies in package.json with correct versions
- [ ] Can import all libraries without errors
- [ ] Versions match those specified in `00-TECHNICAL-DECISIONS.md`

## Notes
- Choose markdown parser based on project needs
- Ensure compatibility with Bun
