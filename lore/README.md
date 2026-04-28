# Lore Authoring Guide

This project uses a game-container lore model with required frontmatter on each lore post.

## Post Files

Location: `lore/posts/*.md`

Required frontmatter keys for lore posts:

```yaml
title: "Story Title"
summary: "Short summary"
tags: [lore, real-moments, riley]
cover_image: /lore/example.png
author: Luna Midori
date: 2026-04-22
game: real-moments
story_order: 6
```

Optional:

```yaml
episode_label: "Rumbodo"
```

Notes:

- `game` must match a game folder under `lore/games/<game-slug>/index.md`.
- `story_order` controls timeline order and lore previous/next navigation.
- Keep `tags` lowercase and include character keys (for example `riley`, `echo`) when possible, because character filters and POV full-story routing use tags.

## Game Index Files

Location: `lore/games/<game-slug>/index.md`

Required frontmatter:

```yaml
title: "Game Display Name"
summary: "One short description for the lore index."
cover_image: /lore/example.png
full_story_pov: riley
```

Notes:

- `full_story_pov` is a character key used by `/lore/game/<game-slug>/full-story`.
- If no posts in the game match that POV tag, the full-story page falls back to all posts in the game.

## Sorting and Navigation Rules

- Lore game containers default to `story_order` descending (newest first).
- Lore detail arrows use timeline direction:
  - `Go back to past story` -> lower `story_order`
  - `Go to next story` -> higher `story_order`
- Scheduled lore posts can still appear as navigation targets on lore detail pages.
