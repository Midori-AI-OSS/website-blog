# Audit: Dependency Vulnerabilities

Check all runtime and dev dependencies for known CVEs, outdated versions, and unmaintained packages.

## Steps

1. Run `bun outdated` to list packages with newer versions available. Flag any major-version gaps or packages >6 months behind.
2. Check `bun.lock` (or `bun.lockb`) for any dependency with a known CVE. Since Bun does not have `bun audit`, use `npm audit` against a temporary `package-lock.json` generated from the same `package.json`, OR use a third-party scanner (e.g., `npx snyk test`, `npx @socketsecurity/cli`, or `osv-scanner`).
3. Inspect `tts/pyproject.toml` — run `uv pip audit` (or `pip-audit`) against the Python dependencies.
4. Check if `gray-matter@4.0.3` (pinned, no caret/tilde) is intentionally pinned for stability or is accidentally stale.
5. Check if the spaCy model (`en-core-web-sm` from `https://github.com/explosion/spacy-models/releases/download/...`) is fetched over HTTPS with integrity verification.
6. Check if `sharp`, `react-markdown`, `rehype-sanitize`, and `highlight.js` are on latest secure versions.

## Output

- A markdown table listing each vulnerable/outdated package, current version, latest version, severity, and recommended action.
- If no issues found, state that explicitly.
- Save the report to `/tmp/agents-artifacts/tasks/audit-dependency-vulnerabilities-report.md`.
