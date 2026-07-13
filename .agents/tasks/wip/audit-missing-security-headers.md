# Audit: Missing Security Headers

**Target:** The entire Next.js application (all routes)

The application does not appear to set any security-related HTTP response headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, etc.).

## Steps

1. Run the dev server (`bun run dev`) and use `curl -I` to check response headers for the main page, blog posts, lore posts, and at least one API route. Document all security-relevant headers present or absent.
2. Alternatively, read `app/layout.tsx` and check if there's a `metadata` export that sets headers. Read `next.config.mjs` for any `headers()` function.
3. Check for any middleware (`middleware.ts`) that might set headers.
4. Assess which headers are needed for this specific app:
   - **Content-Security-Policy** — protects against XSS, especially important since markdown content can contain arbitrary HTML even after sanitization.
   - **X-Content-Type-Options: nosniff** — prevents MIME type sniffing.
   - **X-Frame-Options: DENY** or **SAMEORIGIN** — prevents clickjacking.
   - **Strict-Transport-Security** — if served over HTTPS.
   - **Referrer-Policy** — controls referrer information leakage.
   - **Permissions-Policy** — restricts browser features (microphone, camera, etc.).
5. Check if the embedded radio widget uses an iframe — does it need `frame-src` in CSP?

## Output

- A table of every recommended header, whether it's set, the current value (if any), and the recommended value.
- Propose a `next.config.mjs` `headers()` configuration or a middleware approach.
- Save findings to `/tmp/agents-artifacts/tasks/audit-missing-security-headers-report.md`.
