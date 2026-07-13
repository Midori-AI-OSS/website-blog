# Audit: Rate Limiting Gaps

**Target:** All API routes in `app/api/`

There is no rate limiting on any API route. Several routes perform expensive operations (image processing, TTS generation, ffprobe, proxied fetches).

## Steps

1. Search the entire codebase for any rate-limiting implementation: `grep` for "rate", "throttle", "limit", "limiter", "brute", "abuse" in all source files.
2. Confirm there's no middleware, no API route wrapper, and no external service (e.g., Cloudflare, Nginx rate limit) in play.
3. For each API route, assess the abuse potential:
   - `/api/tts/generate` — CPU-intensive TTS synthesis
   - `/api/radio/probe` — spawns `ffprobe` process
   - `/api/radio/palette` — fetches and processes remote images
   - `/api/radio/stream` — long-lived audio stream connections
   - `/api/blog-images/[filename]` and `/api/lore-images/[...path]` — image serving with `sharp` processing (could be DoSed by requesting many different sizes/transforms)
   - `/api/tts/audio/[...]` and `/api/tts/chunk/[...]` — could be requested in parallel to exhaust TTS server
4. Check if Next.js in standalone mode has any built-in concurrency limits.
5. Check `docker-compose.yaml` for any Nginx or reverse proxy that might provide rate limiting.

## Output

- A table ranking each API route by abuse risk (critical, high, medium, low).
- For critical/high items, propose specific rate limiting thresholds.
- Recommend either a Next.js middleware-based approach or an infrastructure-level solution.
- Save findings to `/tmp/agents-artifacts/tasks/audit-rate-limiting-report.md`.
