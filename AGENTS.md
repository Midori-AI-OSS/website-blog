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
