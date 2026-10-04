# Agent Rules

## Development Container
- Do not run Bun/Bunx, uv/uvx, Python checks, builds, or other project toolchain checks on this laptop's host. Skip storylint entirely. Read-only exploration does not need a container.
- Use `scripts/dev-container.sh` for development commands. It automatically starts `website-blog-dev` when needed and reuses it while running. It uses PixelArch, a one-CPU quota, and a fixed 12-hour lifetime; expiration can interrupt active commands.
- The checkout is bind-mounted at `/app`, following production. Before a fresh start or explicit restart, the helper deletes only this checkout's stale `node_modules`. Reusing a running container leaves dependencies intact. It refuses cleanup when another running container shares the checkout.
- Install dependencies explicitly after every fresh start/restart, before running checks or servers:

  ```bash
  scripts/dev-container.sh exec bun install --frozen-lockfile
  scripts/dev-container.sh exec uv sync --directory tts --upgrade-package 'transformers>=4.57,<5'
  ```

- `UV_PROJECT_ENVIRONMENT=/tmp/website-blog-venv` keeps Python's virtualenv inside the container. `UV_CACHE_DIR`, `UV_PYTHON_INSTALL_DIR`, `BUN_INSTALL_CACHE_DIR`, `BUN_RUNTIME_TRANSPILER_CACHE_PATH`, and `HF_HOME` also point inside container `/tmp`. Do not override them with host-mounted paths or create a Python venv in the checkout.
- The targeted Transformers upgrade avoids an old lockfile resolution that selects `tokenizers 0.10.3`, which needs a Rust source build on Python 3.14. Project dependency declarations stay unchanged. Leave `NODE_ENV` unset globally so Bun tests and Next.js select their appropriate environments.
- Bun's installed dependencies use normal `/app/node_modules`, shared with the checkout. `BUN_INSTALL_CACHE_DIR` moves the download cache, not `node_modules`. No environment/dependency directories are relocated using host symlinks.
- Run checks and servers through the helper:

  ```bash
  scripts/dev-container.sh exec bun run lint
  scripts/dev-container.sh exec bun run test:bun
  scripts/dev-container.sh exec bun run build
  scripts/dev-container.sh exec python -m unittest discover -s scripts/tests -v
  scripts/dev-container.sh exec uv run --directory tts --with httpx python -m unittest discover -s tests -v
  scripts/dev-container.sh exec bun run dev --webpack --hostname 0.0.0.0
  scripts/dev-container.sh exec bash scripts/start-tts.sh start
  ```

- The dev site is available at `http://127.0.0.1:59383`. Next.js and TTS run in the same container; TTS remains on `127.0.0.1:8888` inside it.
- Use `start`, `restart`, `shell`, `status`, or `stop` for lifecycle management. `status` never starts a container; `stop` affects only this owned development container. A different checkout cannot take over the same name.
- If the development image is missing, the helper builds the existing Dockerfile. The one-CPU quota covers the running container; image building is separate setup. If Docker access, image building, or cleanup fails, resolve that error rather than falling back to host toolchain checks or automatically using sudo.
- Store task files, checks, and reports under `/tmp/agents-artifacts/`. Commit completed changes unless the user asks otherwise; do not push unless requested. Do not post a plan unless requested.

## Package Management
- **ALWAYS** use `bun` instead of `npm`, `yarn`, or `pnpm`.
- Use `bun run dev` for the dev server.
- Use `bun run build` for building.
- Use `bun add` and `bun remove` for dependencies.

## UI/UX Standards
- Desktop is the priority experience for this repo. Do not introduce desktop regressions while improving responsive behavior.
- Keep all UI changes phone-friendly.
- Validate UI updates at these viewports: desktop (`>=1280px`), `360x800`, `390x844`, `430x932`, and one tablet sanity check (around `768x1024`).
- No horizontal page scrolling at `360px` width.
- Primary interactive controls should be at least `44x44` on phone viewports.
- Keep body text readable on phones (target `16px` base text for paragraph content).
- Ensure visible focus states for keyboard users.
- For UI-impacting work, store validation evidence in `/tmp/agents-artifacts/` with viewport results and any exceptions.

## Linting & Formatting
- After making code changes, run `bun lint` (or `bunx biome check .`) to check for lint and formatting issues.
- Fix any issues before committing. Use `bunx biome check --write .` to auto-fix most violations.
- If lint issues remain in a PR, report them clearly in the PR description with file paths and rule names.

## Markdown Content Rules
- In `blog/posts/*.md` and `lore/posts/*.md`, curly double quotes are banned.
- Use straight double quotes (`"`) instead of `“` and `”`.

- Token Reference: See `.agents/TOKENS.md` for the canonical reference of all content tokens, shortcodes, and front matter fields available in blog and lore posts. This file must be kept up to date when token systems change.

## Content System Test Pages
- Hidden renderer test pages live at `/blog/test` and `/lore/test`.
- When adding or changing any user-facing blog/lore content behavior, update the relevant test page in the same change.
- Blog test fixtures must not use lore-only `{{...}}` token systems.
- Test pages must stay unlinked from normal navigation and content lists, and must cover representative edge cases for the affected system.
- When token systems documented in `.agents/TOKENS.md` change, update the relevant test page and the token reference together.

## Agent Directory Integrity
- The `.agents/` directory and all of its subdirectories are permanent infrastructure. Do not delete, move, or restructure them.
- `.gitkeep` files in `.agents/` subdirectories must be preserved so empty directories remain tracked in git.
- **No per-task working files belong under `.agents/`.** All task files, audit reports, temp screenshots, and scratch notes must be created under `/tmp/agents-artifacts/`.
- If a prior agent left stray files inside `.agents/`, move them to `/tmp/agents-artifacts/` — never delete the directory, its `.gitkeep`, its `AGENTS.md`, or `setup-agents.sh`.
- When in doubt about whether something is infrastructure vs a working file, **keep it** rather than delete it.
