# Audit: CI/CD Pipeline & Supply Chain Security

**Target files:**
- `package.json` scripts (build, lint, test)
- `Dockerfile` and `docker-entrypoint.sh` (build chain)
- `biome.json` (lint/format config)
- `tsconfig.json` (type-check config)

Note: There is NO `.github/workflows/` directory — no GitHub Actions CI/CD pipeline exists at all. This is itself a critical finding.

Assess the existing build/lint/test tooling and supply chain risks. Recommend a CI/CD pipeline with security gates.

## Steps

1. Confirm that no CI/CD pipeline exists: `ls .github/workflows/` should be empty or the directory should not exist.
2. Audit `package.json` scripts:
   - What does `bun run build` do? Are there security-relevant flags?
   - Is there a `bun run test` script? Are tests run anywhere in automation?
   - Is `bun run lint` (or `bunx biome check`) enforced anywhere other than manual runs?
   - Are there any pre/post install scripts that run arbitrary code from dependencies?
3. Assess the Docker build chain:
   - Is `bun install` run with `--frozen-lockfile` in the Dockerfile/docker-entrypoint?
   - Are dependencies installed at container start (in entrypoint) rather than at build time?
   - Is the base image (`lunamidori5/pixelarch:quartz`) a well-known, maintained image? Is its Dockerfile publicly auditable?
4. Check if there's a `bun.lock` or `bun.lockb` lockfile and whether install commands respect it.
5. Check if `tts/pyproject.toml` has a lockfile (`uv.lock`) and if `uv sync` uses it.
6. Check for any third-party scripts or tools fetched over HTTP at build time (e.g., spaCy model download in Python deps).
7. Recommend a minimal CI/CD pipeline (GitHub Actions or similar) that includes at minimum:
   - Lockfile-enforced install (`bun install --frozen-lockfile`)
   - Lint/format check (`bunx biome check .`)
   - Type check (`bunx tsc --noEmit`)
   - Test run (if tests exist)
   - Dependency vulnerability scan (e.g., osv-scanner, Snyk, or `npm audit`)
   - Secret scanning (e.g., truffleHog, gitLeaks, or GitHub secret scanning)

## Output

- A gap analysis: what automation exists vs. what's missing.
- Flag specific risks: no CI/CD at all, missing `--frozen-lockfile`, base image provenance.
- Provide a sample GitHub Actions workflow YAML as a recommendation.
- Save findings to `/tmp/agents-artifacts/tasks/audit-cicd-supply-chain-report.md`.
