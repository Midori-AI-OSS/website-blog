# Task 13: PR Metadata Update

## Objective
Update PR metadata file with title and body describing the radio page polish.

## Requirements

### Update: `/tmp/agent-pr-metadata-d5bbb4508c.toml`

**Current contents:**
```toml
title = ""
body = ""
```

**Update to:**
```toml
title = "Radio Page Polish: Lore integration, lyrics panel, mobile layout, and animation tuning"

body = """
## Summary
Radio page improvements adding lore integration, lyrics display, mobile layout restructuring, and animation polish.

## Changes
- **Lore session mapping** (`lib/radio/loreSessionMap.ts`): Session-to-slug family config, channel-to-POV mapping, and POV alias detection for matching radio tracks to lore posts.
- **Lore match API** (`app/api/radio/lore-match/route.ts`): GET endpoint that resolves lore matches using session config and track metadata.
- **Lyrics extraction** (`app/api/radio/probe/route.ts`): Added `lyrics-eng` FFprobe tag extraction to probe response.
- **Lore panel**: Replaces Track Story section when a lore match exists, with blurred cover background and fade-in transition.
- **Lyrics panel**: Desktop-only scrollable lyrics display beneath the story/lore box, hidden for instrumental tracks.
- **Cover art click toggle**: Cover art area toggles play/pause with keyboard accessibility and focus states.
- **Mobile layout**: Restructured radio page for mobile — compact single-row bottom bar, volume overlay rail, hidden channel selector.
- **Animation polish**: Tuned transitions across BlobProgressBar, backdrop, player controls, and panels. Respects `prefers-reduced-motion`.
- **Tests**: Added test coverage for lore session map and probe lyrics extraction.
- **Viewport validation**: Validated at desktop, tablet, and mobile breakpoints (360px, 390px, 430px).
"""
```

**Formatting requirements:**
- Use valid TOML syntax. Multi-line strings use triple quotes (`"""`).
- The `body` should be a multi-line string with markdown content.
- Do NOT add any extra TOML keys. Only update `title` and `body`.
- Ensure no trailing whitespace in the TOML values.

**Important:**
- Read the file first to understand its current format.
- Write the complete file (don't just append — overwrite with the new contents).
- Validate TOML syntax after writing. The file must parse correctly.

## Done Criteria
- PR metadata file has updated title
- PR metadata file has descriptive body with all key changes
- TOML format is valid and parses correctly
