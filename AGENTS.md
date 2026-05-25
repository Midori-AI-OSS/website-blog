# Agent Rules

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

## Content System Test Pages
- Hidden renderer test pages live at `/blog/test` and `/lore/test`.
- When adding or changing any user-facing blog/lore content behavior, update the relevant test page in the same change.
- Blog test fixtures must not use lore-only `{{...}}` token systems.
- Test pages must stay unlinked from normal navigation and content lists, and must cover representative edge cases for the affected system.
