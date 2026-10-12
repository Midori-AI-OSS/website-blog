# Agent Rules

## Development Container
- Use `scripts/dev-container.sh` to work in the `website-blog-dev` container. `exec` and `shell` start it when needed and reuse it while it is running. Commands run from `/app`, the checkout mount. The container has a one-CPU quota and stops after 12 hours.
- Supported commands:

  ```bash
  scripts/dev-container.sh start
  scripts/dev-container.sh restart
  scripts/dev-container.sh exec COMMAND [ARG...]
  scripts/dev-container.sh shell
  scripts/dev-container.sh status
  scripts/dev-container.sh stop
  ```

- `start` reuses the running container or creates a fresh one. `restart` recreates it. `exec` starts or reuses the container, then runs the command in `/app`. `shell` opens Bash in `/app`. `status` reports the state without starting or cleaning anything. `stop` stops this checkout's development container.
- A fresh start or restart removes this checkout's stale `node_modules`. Install dependencies before running checks or servers:

  ```bash
  scripts/dev-container.sh exec bun install
  scripts/dev-container.sh exec uv sync --directory tts --upgrade-package 'transformers>=4.57,<5'
  ```

- Run project checks and servers through the helper:

  ```bash
  scripts/dev-container.sh exec bun run lint
  scripts/dev-container.sh exec bun run test:bun
  scripts/dev-container.sh exec bun run build
  scripts/dev-container.sh exec uv run python -m unittest discover -s scripts/tests -v
  scripts/dev-container.sh exec uv run --directory tts --with httpx python -m unittest discover -s tests -v
  scripts/dev-container.sh exec bun run dev --webpack --hostname 0.0.0.0
  scripts/dev-container.sh exec bash scripts/start-tts.sh start
  ```

- The dev site is available at `http://127.0.0.1:59383`. TTS runs at `127.0.0.1:8888` inside the container.
- If the development image is missing, the helper builds it before starting the container.

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
- `/blog/test` and `/lore/test` are hidden indexes. Each distinct tested system has its own child page, and each index links to every test page for that content type with a short purpose.
- Keep the Blog and Lore page registries in sync with the child routes. Each registry stores index metadata only: route, title, and purpose. Keep fixture data in its test page or component. The shared `/transition-test` page appears in both indexes and preserves the Blog or Lore Markdown return context from its link.
- Give each index and test page a plain-language explanation of what a visitor will see. Give each child page a clear link back to its matching test index.
- Test pages must set `noindex` and `nofollow`, stay out of normal navigation and content lists, and cover representative cases for the affected system.
- Keep Blog and Lore renderer fixtures separate. Blog test fixtures must not use Lore-only `{{...}}` tokens. Lore image and species card token coverage belongs on `/lore/test/lore-tokens`; its Markdown page may also keep representative examples.
- Keep Blog and Lore TTS coverage on their respective `/tts` pages. Use the normal post audio controls and `/api/tts` generation/playback flow, and include normal speech plus fictional-language audio examples. Keep visual language reveal coverage on each content type's `/language-markup` page.
- Keep the password gate only on `/lore/test/password-gate`. The Lore Markdown and TTS pages stay unlocked.
- When user-facing Blog or Lore content behavior changes, update the relevant dedicated test page in the same change. When token systems documented in `.agents/TOKENS.md` change, update the relevant test page and token reference together.

## Agent Directory Integrity
- The `.agents/` directory and all of its subdirectories are permanent infrastructure. Do not delete, move, or restructure them.
- `.gitkeep` files in `.agents/` subdirectories must be preserved so empty directories remain tracked in git.
- **No per-task working files belong under `.agents/`.** All task files, audit reports, temp screenshots, and scratch notes must be created under `/tmp/agents-artifacts/`.
- If a prior agent left stray files inside `.agents/`, move them to `/tmp/agents-artifacts/` — never delete the directory, its `.gitkeep`, its `AGENTS.md`, or `setup-agents.sh`.
- When in doubt about whether something is infrastructure vs a working file, **keep it** rather than delete it.
