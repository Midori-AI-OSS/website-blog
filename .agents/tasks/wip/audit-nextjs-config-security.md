# Audit: Next.js Configuration Security

**Target files:**
- `next.config.mjs`
- `app/layout.tsx` (metadata, headers)
- Any `middleware.ts` (if exists)

Audit Next.js configuration for security-relevant settings.

## Steps

1. Read `next.config.mjs` line by line. Check for:
   - `output: 'standalone'` — any security implications for the standalone build?
   - `reactStrictMode: true` — already set (good).
   - `images` configuration — are remote image patterns restricted?
   - `headers()` — any security headers configured?
   - `poweredByHeader` — is it disabled (hides `X-Powered-By: Next.js`)? If not set, it defaults to exposing Next.js version.
   - `crossOrigin` — is it set to `'anonymous'` for resource isolation?
   - `experimental` settings — any risky experimental flags enabled?
2. Read `app/layout.tsx` — check the `metadata` export for `robots`, `openGraph`, `viewport` settings.
3. Search for a `middleware.ts` file at the root or in `app/`.
4. Check `tsconfig.json` — is `strict: true` present? (Type safety is a security boundary.)
5. Check `biome.json` — are any security-related lint rules disabled?

## Output

- List every security-relevant Next.js config option, current value, and recommended value.
- Flag any that expose version info or allow overly permissive behavior.
- Note if middleware is completely absent (no route protection possible without it).
- Save findings to `/tmp/agents-artifacts/tasks/audit-nextjs-config-security-report.md`.
