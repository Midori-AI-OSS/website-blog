# Audit: Docker Security Hardening

**Target files:**
- `Dockerfile`
- `docker-compose.yaml`
- `docker-entrypoint.sh`
- `.dockerignore`

The Docker setup installs packages via AUR (`yay`) and uses `sudo`, which are red flags. The image should be audited for best practices.

## Steps

1. Read `Dockerfile` line by line. Flag:
   - Does the image run as root? (`USER` directive present or absent?)
   - Are there any `sudo` calls inside the container?
   - Does it use `yay` (AUR helper) which downloads unverified packages?
   - Is the source code bind-mounted (`volumes` in docker-compose) with read-write access?
   - Are there any sensitive files copied into the image (`.git/`, `.env`, SSH keys)?
   - Does it run multiple processes in one container (TTS + Next.js)?
2. Read `.dockerignore`:
   - Does it exclude `node_modules`, `.git`, `.env*`, `*.log`, `__pycache__`?
3. Read `docker-entrypoint.sh`:
   - Does it run `bun install` at container start? What happens if a dependency is compromised between build and run?
   - Does it run `bun run build` at start? This means build tooling is in the production image.
   - Are there any secrets in environment variables?
4. Check if the container has unnecessary capabilities (check docker-compose for `privileged`, `cap_add`, etc.).
5. Check if the published port (`59382`) is the only exposed port, and if the TTS port (`8888`) is exposed externally.

## Output

- A list of hardening recommendations with priority (critical/high/medium/low).
- Include specific Dockerfile changes needed: non-root user, multi-stage build, slim base image, lockfile-only install.
- Recommend removing build tooling from production image (build in CI, ship only the standalone output).
- Save findings to `/tmp/agents-artifacts/tasks/audit-docker-security-report.md`.
