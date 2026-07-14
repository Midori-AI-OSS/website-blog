# Audit: Path Traversal Protections Verification

**Target files:**
- `lib/blog/loader.ts`
- `lib/lore/loader.ts`
- `app/api/blog-images/[filename]/route.ts`
- `app/api/lore-images/[...path]/route.ts`

Existing code already has some path traversal protections (regex validation, realpath checks, segment filtering). This task verifies they are complete and bypass-resistant.

## Steps

1. Read `lib/blog/loader.ts` — verify the regex `^\d{4}-\d{2}-\d{2}\.md$` and the `realpath()` + `isPathInsideDirectory()` logic. Test edge cases:
   - Null bytes (`%00`)
   - URL-encoded slashes (`%2F`, `%5C`)
   - Double dots with encoding (`%2e%2e`)
   - Long paths, symlink attacks
   - Absolute paths, Windows paths with `C:\`
2. Read `lib/lore/loader.ts` — verify the segment-by-segment validation covers all attack vectors.
3. Read `app/api/blog-images/[filename]/route.ts` — verify the filename regex and any path construction. Test with the same edge cases.
4. Read `app/api/lore-images/[...path]/route.ts` — verify segment validation and extension whitelist. Test edge cases.
5. Search for any other places where user-supplied filenames or paths are used to read files — check all `fs.readFile`, `fs.readFileSync`, `path.join`, `path.resolve` calls in the codebase.
6. Check if `public/` directory is served by Next.js's static file handler — could someone traverse out of public?

## Output

- For each file: state whether the protection is complete or list specific bypasses.
- If any bypass is found, provide the exact payload (e.g., `../../../etc/passwd%00.md`).
- Recommend additional hardening if gaps exist.
- Save findings to `/tmp/agents-artifacts/tasks/audit-path-traversal-protections-report.md`.
