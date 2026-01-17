# Task: Setup Project Structure

## Objective
Initialize the project with Bun and create the basic blog folder structure.

## Prerequisites
- **REQUIRED:** `00-TECHNICAL-DECISIONS.md` completed (all choices made)
- Know: Framework, TypeScript/JavaScript, directory structure preferences

## Steps
1. Check if project already initialized:
   ```bash
   if [ -f "package.json" ]; then
     echo "✓ Project already initialized"
     cat package.json
   else
     echo "Initializing new Bun project..."
     bun init -y
   fi
   ```

2. Create directory structure (based on technical decisions):
   ```bash
   # Core blog directory
   mkdir -p blog/posts
   
   # Utilities directory (lib/ or utils/ - from technical decisions)
   mkdir -p lib/blog  # OR utils/blog
   
   # Components directory (from technical decisions)
   mkdir -p components/blog  # OR src/components/blog
   
   # Pages/app directory (framework dependent - from technical decisions)
   # For Next.js App Router:
   # mkdir -p app/blog
   # For Next.js Pages Router:
   # mkdir -p pages/blog
   # For Vite + React:
   # mkdir -p src/pages
   ```

3. Add `.gitkeep` to blog/posts:
   ```bash
   touch blog/posts/.gitkeep
   ```

4. Initialize TypeScript (if chosen in technical decisions):
   ```bash
   # Only if TypeScript chosen
   cat > tsconfig.json << 'EOF'
   {
     "compilerOptions": {
       "target": "ES2022",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "jsx": "react-jsx",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     },
     "include": ["**/*.ts", "**/*.tsx"],
     "exclude": ["node_modules"]
   }
   EOF
   ```

5. Verify structure:
   ```bash
   tree -L 3 -I node_modules
   # Or: ls -R
   ```

## Success Criteria
- [x] Project initialized with Bun (package.json exists)
- [x] `blog/posts/` directory exists with .gitkeep
- [x] Utilities directory created (lib/blog/ or utils/blog/)
- [x] Components directory created (components/blog/ or src/components/blog/)
- [x] Pages/app directory structure created (framework dependent)
- [x] TypeScript configured (if chosen) with tsconfig.json
- [x] All directories tracked by git
- [x] Structure matches decisions in `00-TECHNICAL-DECISIONS.md`

## Notes
- Use Bun for all development and scripts
- This is the foundation for the blog system

---

## Completion Note
**Status:** ✅ Complete (Audit Issues Resolved)  
**Date:** 2025-01-17 (Updated after audit feedback)  
**Completed By:** Coder Agent

### Summary
Successfully initialized the project with Bun and created all required directory structures:
- Installed Bun v1.3.6
- Initialized Bun project with TypeScript support
- Created Next.js App Router structure with placeholder page files:
  - `app/blog/page.tsx` - Blog list route placeholder
  - `app/blog/[slug]/page.tsx` - Dynamic post route placeholder
- Created `blog/posts/` directory with `.gitkeep`
- Created `lib/blog/` for utilities (parser, loader services)
- Created `components/blog/` for React components
- Updated `tsconfig.json` with DOM libs, strict mode, and Next.js-compatible settings
- All files staged and tracked by git

### Files Created
- `package.json` - Bun project manifest
- `tsconfig.json` - TypeScript configuration with strict mode
- `blog/posts/.gitkeep` - Blog posts directory
- `lib/blog/` - Utilities directory
- `components/blog/` - Components directory
- `app/blog/page.tsx` - Blog list route placeholder
- `app/blog/[slug]/page.tsx` - Dynamic post route placeholder

### Dependencies Note
**Framework dependencies (Next.js, React) are intentionally NOT installed in this task.**
They will be installed in Task 04: Install Dependencies, which specifies exact versions
from technical decisions.

### Audit Resolution
Resolved issues identified in audit:
1. ✅ Created missing Next.js page files (`app/blog/page.tsx` and `app/blog/[slug]/page.tsx`)
2. ✅ Documented that dependencies are deferred to Task 04 (by design)
3. ✅ Verified Bun v1.3.6 installation and availability
4. ✅ Updated completion summary to reflect actual implementation

### Next Task
Task 04: Install Dependencies
