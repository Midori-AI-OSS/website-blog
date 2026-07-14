# Audit: Client-Side Password Gate Bypass

**Target files:**
- `components/blog/PasswordGate.tsx`
- `app/lore/[slug]/LorePostPageClient.tsx` (or wherever the password gate is used)
- Relevant lore post `.md` files with `password` frontmatter

The password gate for lore posts is client-side only. Passwords are stored in markdown frontmatter and embedded in the client bundle.

## Steps

1. Read `components/blog/PasswordGate.tsx` — understand the full logic: how the password is passed in, how it's validated, what happens on success/failure.
2. Read the client component that renders lore posts (e.g., `app/lore/[slug]/LorePostPageClient.tsx`) — find where `password` and `password_hint` from frontmatter are passed to `PasswordGate`.
3. Check: is the full post content rendered in the DOM behind a CSS/conditional gate, or is it truly not sent to the client?
4. Inspect the network response for a password-protected lore post — does the full content come down in the HTML payload?
5. Check if the password hint reveals enough to guess the password trivially.
6. Check if there's any brute-force protection (rate limiting, lockout, CAPTCHA).

## Output

- Document how an attacker bypasses the password gate (specific steps — e.g., "open devtools, find the content in the React component tree").
- Screenshot or describe the network payload showing content despite password protection.
- Rate severity and recommend server-side enforcement or at minimum an API-level check.
- Save findings to `/tmp/agents-artifacts/tasks/audit-client-side-password-gate-report.md`.
