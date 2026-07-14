# Audit: Error Information Disclosure

**Target:** All API routes and error handling code

Error responses might leak stack traces, file paths, internal IPs, dependency versions, or other sensitive information to clients.

## Steps

1. Search for all error handling patterns in API routes:
   - `error.message`, `error.stack`, `error instanceof Error`
   - `console.error` calls that might return stack to client
   - `NextResponse.json({ error: ... })` patterns
   - `return new Response(...)` with error details
2. For each API route in `app/api/`, read the error handling:
   - What information is returned to the client on error?
   - Is it a generic message or does it include the actual error?
   - Does any route return stack traces?
3. Check `next.config.mjs` — is there any error page customization?
4. Check if Next.js in production mode (`NODE_ENV=production`) suppresses detailed errors, or if custom error handlers override this.
5. Check the `/api/radio/probe` route specifically — it calls `ffprobe` and might return stderr which could leak system paths.
6. Check the `/api/radio/palette` route — the Sharp image processing errors might leak file paths.
7. Check the TTS routes — Python tracebacks might be returned to the client.

## Output

- A table listing each API route, whether it leaks error details, and what exactly is leaked.
- For each leak, provide the exact code line that returns sensitive data.
- Recommend: always return generic error messages in production, log details server-side only.
- Save findings to `/tmp/agents-artifacts/tasks/audit-error-info-disclosure-report.md`.
