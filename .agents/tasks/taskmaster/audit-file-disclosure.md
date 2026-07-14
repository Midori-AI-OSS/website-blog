# Audit: Public File and Information Disclosure

**Target:**
- `public/` directory
- `app/` route structure
- File serving via API routes and static files

Check what files and information are publicly accessible, intentionally or accidentally.

## Steps

1. List all files in `public/` — are any of them not meant to be public?
2. Check Next.js static file serving behavior — by default, `public/` files are served at the root path. Are there any files like `.env.example`, `.gitkeep`, or backup files in `public/`?
3. Check `.gitignore` for what's excluded from the repo, but also check if any of those files exist on disk.
4. Check API routes for any that might expose file listings:
   - `app/api/radio-images/route.ts` — does it return a full directory listing?
   - `app/api/blog-images/[filename]/route.ts` — can a directory listing be triggered?
5. Check if blog/lore markdown source files are accessible through any route. Content is in `blog/posts/` and `lore/posts/` which are outside `public/` — verify no route exposes raw `.md` files.
6. Check the `/_next/` build output paths — are source maps exposed in production?
7. Check the `/llm` routes — these expose post content in plain text. Is this intentional? Are there posts that should NOT appear in the LLM index?
8. Check `robots.txt` and sitemap behavior — are there routes that should be excluded?

## Output

- A list of every file or information type that is publicly accessible when it arguably shouldn't be.
- For each finding, provide the URL path and the file/route responsible.
- Recommend `robots.txt` exclusions or route access controls.
- Save findings to `/tmp/agents-artifacts/tasks/audit-file-disclosure-report.md`.
