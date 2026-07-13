# Audit: Radio API Proxy Security

**Target directory:** `app/api/radio/`

Seven API routes proxy requests to `https://radio.midori-ai.xyz`. The proxy layer should be audited for URL manipulation, response handling, and trust boundaries.

## Steps

1. Read every route file in `app/api/radio/` (7 files). For each, trace how user input reaches the outgoing fetch to `radio.midori-ai.xyz`.
2. Check `lib/radio/` — read the radio client, helpers, and any validation/normalization functions.
3. For each route, answer:
   - Is the outgoing URL constructed safely (no path traversal, no query injection)?
   - Is the response from the upstream radio server validated before being forwarded to the client?
   - Could a compromised upstream radio server inject malicious content (XSS, redirect) into the proxy response?
   - Are response headers from upstream forwarded as-is to the client? Could this leak internal headers or set malicious cookies?
   - For the `/stream` route specifically: is the audio stream proxy vulnerable to resource exhaustion (unlimited connections, no timeout)?
4. Check `app/api/radio/heartbeat/route.ts` — does the heartbeat endpoint have any abuse potential (fake listener counts, flooding)?

## Output

- A table per route with verdict (safe / needs hardening) and specific risk(s).
- For any unsafe route, provide exact line numbers and a proposed fix.
- Pay special attention to header forwarding and response validation.
- Save findings to `/tmp/agents-artifacts/tasks/audit-radio-proxy-security-report.md`.
