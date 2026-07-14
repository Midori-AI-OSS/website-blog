# Audit: SSRF in Radio Palette API

**Target file:** `app/api/radio/palette/route.ts`

The palette API accepts an arbitrary `url` query parameter and passes it to `fetch()` with no validation. This is a server-side request forgery (SSRF) vulnerability.

## Steps

1. Read `app/api/radio/palette/route.ts` in full. Identify the exact `fetch()` call site.
2. Read `lib/theme/artPalette.ts` (the palette extraction logic) to understand what URL is ultimately fetched and what happens with the response. Also check `lib/radio/client.ts` and `lib/radio/contract.ts` for how the stream URL is constructed.
3. Determine what an attacker can achieve:
   - Can they access `localhost:8888` (the TTS service)?
   - Can they access `http://169.254.169.254/latest/meta-data/` (cloud metadata, if relevant)?
   - Can they access internal services on the host network (e.g., `127.0.0.1:3000`)?
   - Can they trigger outbound requests to arbitrary external hosts?
4. Check if there's any scheme restriction (http vs https, or data/file/ftp).
5. Check for any redirect following behavior — does `fetch()` follow redirects to internal IPs?

## Output

- Document the vulnerable code path with line numbers.
- Provide a proof-of-concept (the exact curl command or URL that would exploit it).
- Recommend a fix (URL whitelist, host allowlist, block private/reserved IP ranges, etc.).
- Save findings to `/tmp/agents-artifacts/tasks/audit-ssrf-palette-api-report.md`.
