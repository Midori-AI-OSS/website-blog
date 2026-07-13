# Audit: In-Memory Cache Denial-of-Service

**Target:** All `Map`-based caches in the codebase

Several API routes use unbounded in-memory `Map` objects for caching. Without size limits or TTL eviction, they can grow arbitrarily and exhaust server memory.

## Steps

1. Search the entire codebase for `new Map` and `Map<` patterns. Find all in-memory caches in API routes and lib modules.
2. For each cache found, document:
   - What's being cached (images, promises, status objects)?
   - What's the key (URL, slug, filename)?
   - Is there a max size?
   - Is there a TTL / eviction policy?
   - How large can a single entry grow?
3. Key areas to check:
   - Blog image loader caching
   - Lore image loader caching
   - Radio palette promise dedup map
   - Radio pending requests map
   - TTS generation status tracking
4. Assess the attack: could an attacker make many requests with unique cache keys to fill memory?
5. Check if Node.js/Bun has memory limits configured in the Docker setup.

## Output

- A table listing each cache, its location, key type, size bound (or lack thereof), and risk level.
- For unbounded caches, estimate the memory exhaustion potential (e.g., "1000 unique image requests = X MB").
- Recommend solution: LRU eviction, max size limits, or TTL-based expiration.
- Save findings to `/tmp/agents-artifacts/tasks/audit-cache-dos-report.md`.
