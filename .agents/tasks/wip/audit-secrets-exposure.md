# Audit: Secrets and Credential Exposure

**Target:** Entire codebase

Check for hardcoded secrets, API keys, tokens, passwords, and other credentials in source files, config files, and committed artifacts.

## Steps

1. Search for common secret patterns across the entire repo:
   - API key patterns: `key`, `secret`, `token`, `password`, `api_key`, `apikey`, `auth`
   - URL patterns with credentials: `://user:pass@`
   - Private key patterns: `-----BEGIN`, `PRIVATE KEY`, `RSA PRIVATE`
   - JWT secrets, session secrets
   - Database connection strings with credentials
   - IP addresses or internal hostnames that shouldn't be public
2. Use `grep` (or `rg`) with case-insensitive search for each pattern. Include all file types.
3. Check `_headers`, `vercel.json`, `next.config.mjs`, `biome.json` for any embedded secrets.
4. Check all markdown files in `blog/posts/` and `lore/posts/` — could any content accidentally contain credentials?
5. Check `public/` directory — any files that shouldn't be publicly accessible?
6. Check git history for previously committed secrets: `git log -p --all | grep -i "secret\|password\|token\|key"`.
7. Check if there are any references to cloud service credentials (AWS, GCP, Azure) — the app seems self-hosted but verify.

## Output

- List every finding with file path, line number, and the type of secret found.
- If a finding is a false positive (e.g., the word "password" in a blog post about security), mark it as such.
- If no secrets are found, state that clearly.
- Save findings to `/tmp/agents-artifacts/tasks/audit-secrets-exposure-report.md`.
