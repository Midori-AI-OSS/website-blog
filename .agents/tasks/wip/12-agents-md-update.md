# Task 12: AGENTS.md Update

## Objective
Add radio-specific notes to the project AGENTS.md at `/home/midori-ai/workspace/AGENTS.md`.

## Requirements

### Update: `/home/midori-ai/workspace/AGENTS.md`

**Current file structure** (42 lines):
- `# Agent Rules` (line 1)
- `## Package Management` (line 3)
- `## UI/UX Standards` (line 9)
- `## Linting & Formatting` (line 19)
- `## Markdown Content Rules` (line 24)
- `## Content System Test Pages` (line 30)
- `## Agent Directory Integrity` (line 37)

**New section to append:**

Add a `## Radio Lore Integration` section after the `## Agent Directory Integrity` section (as a new top-level `##` heading at the end of the file, before any trailing blank line):

```markdown
## Radio Lore Integration
- Radio lore session mappings live in `lib/radio/loreSessionMap.ts`.
- When adding new Real Moments sessions or changing lore slugs, update the radio session/lore map.
- Do not show raw backstory/theme metadata unless explicitly approved.
```

**Style rules:**
- Match the existing formatting: `## Section Title`, blank line after heading, then `- ` bullet points.
- No trailing whitespace.
- Ensure a blank line before the new section heading.
- Do not modify any existing content. Only append.

**Edge cases:**
- If the section already exists (e.g., from a previous run), do NOT duplicate it. Check first.
- Ensure the file ends with a newline character.

## Done Criteria
- AGENTS.md contains the new `## Radio Lore Integration` section
- Existing content completely unchanged
- Formatting matches existing style (## headings, - bullets)
