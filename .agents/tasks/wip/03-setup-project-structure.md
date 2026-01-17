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
- [ ] Project initialized with Bun (package.json exists)
- [ ] `blog/posts/` directory exists with .gitkeep
- [ ] Utilities directory created (lib/blog/ or utils/blog/)
- [ ] Components directory created (components/blog/ or src/components/blog/)
- [ ] Pages/app directory structure created (framework dependent)
- [ ] TypeScript configured (if chosen) with tsconfig.json
- [ ] All directories tracked by git
- [ ] Structure matches decisions in `00-TECHNICAL-DECISIONS.md`

## Notes
- Use Bun for all development and scripts
- This is the foundation for the blog system
