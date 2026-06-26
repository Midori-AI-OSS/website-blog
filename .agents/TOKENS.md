# Content Token & Shortcode Reference

This document is the canonical authoring guide for all custom tokens, shortcodes, and front matter fields used in blog and lore posts.

---

## Quick Reference

| Token / Field | Scope | Description |
|---|---|---|
| `{{image: <path>}}` | Lore only | Embeds a lore image with fallback chain |
| `{{speciescard: lore/<slug>}}` | Lore only | Injects a species care card embed |
| `<thinking>...</thinking>` | Blog + Lore | Renders text with animated gradient styling |
| `<celestial>...</celestial>` | Blog + Lore | Renders text in a fictional Celestial font (sans-serif) |
| `<abyssal>...</abyssal>` | Blog + Lore | Renders text with a glitchy fictional Abyssal font switch |
| `"dialogue quotes"` | Blog + Lore | Applies automatic dialogue coloring to quoted text |
| Front matter fields | Blog + Lore | Post metadata: title, summary, tags, dates, passwords, etc. |

---

## `{{image: <path>}}`

**Scope:** Lore only

**Syntax:**
```
{{image: /lore/slug/filename.png}}
```

Whitespace around the colons and path is flexible — all of these work:
```
{{image: /lore/slug/file.png}}
{{ image : /lore/slug/file.png }}
{{  image:  /lore/slug/file.png  }}
```

**Behavior:** Replaced with an embedded lore image. If the specified image file is not found, the renderer falls back through this chain:

1. Requested image file
2. The game's cover image (associated with the post)
3. A static placeholder graphic

**Usage rules:**
- Only available in lore posts. Blog posts must not use `{{...}}` tokens.
- Paths are relative to the lore asset directory (prefix with `/lore/`).
- Token is not nestable — the image path must be a plain string.

---

## `{{speciescard: lore/<slug>}}`

**Scope:** Lore only

**Syntax:**
```
{{speciescard: lore/w-e-a-v-e}}
```

An optional version parameter can be appended:
```
{{speciescard: lore/w-e-a-v-e?version=1.0}}
```

**Behavior:** Injects a species care card embed into the post content. The card renders species-specific information (habitat, diet, behavior, etc.) with its own styling.

**Auto-grouping:** When two or more speciescard tokens appear consecutively with no text or other tokens between them, they are automatically grouped into a responsive grid layout. If tokens are separated by other content, each renders as a standalone card.

**Usage rules:**
- Only available in lore posts.
- Blog test fixtures (at `/blog/test`) must not use `{{...}}` tokens, including speciescard.
- The slug references a species defined in lore data.
- Token is not nestable.

---

## `<thinking>...</thinking>`

**Scope:** Blog + Lore

**Syntax — Inline variant:**
```markdown
Some paragraph text with <thinking>hidden insight</thinking> inline.
```

**Syntax — Block variant:**
```markdown
<thinking>
A longer passage of thought
that spans multiple lines.
</thinking>
```

**Behavior:** Both variants render the enclosed text with animated gradient text styling. The inline variant applies this styling within the flow of a paragraph. The block variant renders as a standalone styled block.

**Usage in titles:** The `<thinking>` tag also works inside the `title` front matter field. When used in a title:
- The tag markup is stripped from the displayed title text.
- The content inside the tag receives animated styling.
- In lore posts, the thinking text gets enhanced glitch visual effects.

**Usage rules:**
- Tags must be properly closed; unclosed `<thinking>` is treated as literal text.
- Nesting other tokens inside `<thinking>` is not supported.

---

## `<celestial>...</celestial>`

**Scope:** Blog + Lore

**Syntax:**
```markdown
<celestial>Fictional celestial text</celestial>
```

**Reveal variant:**
```markdown
<celestial:R>Hidden text that reveals on hover</celestial>
```

**Behavior:** Renders enclosed text in a custom Celestial font (a fictional sans-serif typeface). The reveal variant starts in Celestial, then on hover backspaces the fictional text, swaps to the inherited readable font, and types the text back in. On mouseleave, it waits 5 seconds before reversing back to Celestial. The cursor appears only while the typewriter animation is active.

**Usage rules:**
- Inline only — always renders as `<span>`, never as a block element.
- Tags must be properly opened and closed with matching language ID. `</celestial>` only closes `<celestial>`; `</abyssal>` only closes `<abyssal>`.
- The `:R` flag goes on the opening tag only, not the closing tag.
- Not supported in post titles — `<celestial>` / `<abyssal>` render as literal text in title fields.
- Stray or unmatched tags are silently dropped; the enclosed text remains visible.

---

## `<abyssal>...</abyssal>`

**Scope:** Blog + Lore

**Syntax:**
```markdown
<abyssal>Fictional abyssal text</abyssal>
```

**Reveal variant:**
```markdown
<abyssal:R>Hidden text that reveals on hover</abyssal>
```

**Behavior:** Renders enclosed text with a fictional Abyssal font treatment. The reveal variant starts in Abyssal, then on hover backspaces the fictional text, swaps to the inherited readable font, and types the text back in. On mouseleave, it waits 5 seconds before reversing back to Abyssal. The cursor appears only while the typewriter animation is active.

**Usage rules:**
- Inline only — always renders as `<span>`, never as a block element.
- Tags must be properly opened and closed with matching language ID. `</abyssal>` only closes `<abyssal>`; `</celestial>` only closes `<celestial>`.
- The `:R` flag goes on the opening tag only, not the closing tag.
- Not supported in post titles — `<celestial>` / `<abyssal>` render as literal text in title fields.
- Stray or unmatched tags are silently dropped; the enclosed text remains visible.

---

## `"dialogue quotes"`

**Scope:** Blog + Lore

**Behavior:** Any text wrapped in standard straight double quotes (`"`) is automatically detected and rendered with dialogue styling (colored text distinct from narration). This applies to all quote-wrapped text in post bodies.

**Curly quote normalization:** Curly/smart quotes (`""`) are automatically normalized to straight quotes (`"`) at render time, so even if source markdown contains curly quotes, they still get dialogue styling. However, curly quotes should not be relied upon — authors should use straight quotes in source files.

**Exclusions:** Dialogue styling does **not** apply inside:
- Code blocks (`code`/`pre` elements)
- Blockquotes
- `<script>` elements
- `<style>` elements

**Usage rules:**
- Curly double quotes are banned in `blog/posts/*.md` and `lore/posts/*.md` source files. Use straight double quotes (`"`) instead.
- Single quotes are unaffected by this system.

---

## Front Matter Fields

**Scope:** Blog + Lore

Available front matter fields for both blog and lore posts:

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Post title. Supports `<thinking>...</thinking>` tags for animated styling. |
| `summary` | No | Short description shown in previews and listings. |
| `tags` | No | Comma-separated list of tags for filtering and categorization. |
| `cover_image` | No | Path to a cover/hero image for the post. |
| `date` | No | Publication date. **Future dates** cause the post to render as a scheduled teaser card instead of showing full content. |
| `author` | No | Author display name. |
| `game` | No | Associates the post with a specific game (used for lore context and fallback images). |
| `story_order` | No | Numeric ordering field for story sequences. |
| `episode_label` | No | Label for season/episode identification (e.g. "Season 1, Episode 3"). |
| `password` | No | Enables password-gated content. Readers must enter this password to view the post. |
| `password_hint` | No | A hint shown to readers before they enter the password. Only relevant when `password` is set. |
| `full_story_pov` | No | Point-of-view attribution for full-story entries. |
| `full_story_tooltip` | No | Tooltip text displayed alongside full-story links. |

### Special behaviors

- **Scheduled posts:** Set `date` to a future value to show only a teaser card until that date passes. The full content is hidden until the scheduled date.
- **Password-gated content:** When `password` is set, the post body is hidden behind a password form. The `password_hint` is displayed as a clue. Use without `password_hint` if you want no hint shown.
- **Date format:** Use ISO 8601 date strings (e.g. `2025-06-26` or `2025-06-26T12:00:00Z`).

---

## Cross-Cutting Rules

- **Blog test fixtures** (`/blog/test`) must **not** use `{{...}}` token systems. This is a strict policy — the blog test page is for blog renderer testing only.
- **Curly quotes** (`""`) should be avoided in source markdown. Use straight double quotes (`"`) even though curly quotes are auto-normalized at render time.
- **Tokens are not nestable.** Image tokens resolve first at the string level, then speciescard tokens split markdown into segments, then react-markdown handles everything else. You cannot put one token inside another.
