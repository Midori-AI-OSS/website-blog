# Species Card Markdown Loader Notes

Companion note for `.agents/temp/species-card-ui-idea.md`. The current prototype proves the card UI shape, but the real feature should load species care cards from Markdown files instead of hard-coded React objects.

## Goal

Add interactive species care cards as optional reader-reward lore artifacts.

These cards are not private records and are not part of the main navigation. They are public extra worldbuilding for readers who notice an embedded card or scan its QR code.

## Authoring Token

Lore Markdown can embed a full card with a token:

```md
{{speciescard: /lore/species-cards/luna-midori.md}}
```

Rules:

- Only accept paths under `/lore/species-cards/`.
- Only accept `.md` files.
- Keep this path style similar to existing lore image tokens like `{{image: /lore/...}}`.
- Render a visible placeholder/error card for missing or invalid files.

## Content Location

Species card source files should live here:

```txt
lore/species-cards/*.md
```

These files should not be loaded by the normal lore timeline/index loader.

## Reader Experience

- A lore post can render a full 3D flip species care card inline.
- The inline card can flip between front/back summaries.
- The card contains a real scannable QR code.
- The QR code points to the hidden standalone page for that same card.
- The standalone page can show the larger registry/scan view from the prototype.
- The hidden page is public but not linked from nav, Blog, or Lore indexes.

Suggested route shape:

```txt
/species-care/[slug]
```

Example:

```txt
/species-care/luna-midori
```

The QR target should be the absolute site URL for that route when possible.

## Parser Contract

Use heading/list parsing, not frontmatter-heavy data objects. The parser should be case-insensitive for heading names but strict about required sections.

The loader should return a normalized object roughly matching the prototype card data:

```ts
interface SpeciesCareCardRecord {
  slug: string;
  title: string;
  identity: Record<string, string>;
  access: Record<string, string>;
  front: {
    primaryCareFlag: string;
    identityCaution: string;
  };
  contacts: Record<string, string>;
  back: Record<string, string>;
  careModifiers: Record<string, string>;
  scanSections: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }>;
}
```

Required data:

- `# Title`
- `## Identity`
- `## Access`
- `## Front Card`
- `## Back Card`
- `## Care Modifiers`
- `## Scan Record`
- `Identity > Preferred`
- `Identity > Species`
- `Access > Healthcare ID`

## UI Integration Plan

- Keep the card UI as a client component.
- Replace hard-coded prototype data with parsed `SpeciesCareCardRecord` props.
- Convert Tailwind classes to the repo's existing Joy UI / `sx` styling unless Tailwind is intentionally adopted later.
- Preserve the 3D flip interaction for inline lore embeds.
- Make the inline embed responsive with no horizontal page scrolling at `360px`.
- Put the expanded registry/scan view on the hidden standalone page.
- Replace the fake QR grid with a real QR generator.

## Rendering Flow

1. `PostView` detects `{{speciescard: /lore/species-cards/luna-midori.md}}` tokens.
2. The server page loads any referenced species card Markdown files before rendering the client post view.
3. The client post view receives a map of token path to parsed card data.
4. The Markdown renderer replaces the token with the interactive card component.
5. The QR code on the rendered card links to `/species-care/luna-midori`.
6. The standalone `/species-care/[slug]` page loads the same Markdown file and renders the full card/scan experience.

## Implementation Decisions

- Use the `qrcode` package for real QR generation when implementation starts. Add it with `bun add qrcode`; add `@types/qrcode` only if TypeScript needs separate package types.
- Do not include PNG export in the real system. That was prototype-only.
- Species card token failures should render a visible placeholder/error card using the current post's cover art with an approximately 15% red tint.
- Shared species profiles will be separate Markdown-backed records for reusable species guidance.
