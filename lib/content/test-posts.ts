import type { ParsedPost } from '@/lib/blog/parser';

export const blogRendererTestPost: ParsedPost = {
  filename: 'blog-renderer-test.md',
  metadata: {
    title: 'Blog Renderer Test Post',
    summary:
      'A hidden fixture for checking standard blog metadata, markdown layout, media, and typography without entering the normal post list.',
    tags: ['test-fixture', 'renderer', 'blog'],
    cover_image: '/blog/placeholder.png',
    date: '2026-05-25',
    author: 'Midori AI Test Fixture',
  },
  content: `# Blog Markdown Coverage

This page is a hidden renderer fixture for normal blog posts. It should cover standard markdown behavior without using lore-only brace tokens.

Inline emphasis should work with **strong text**, *italic text*, inline \`code\`, and [a normal link](/blog).

## Lists

- First unordered item with enough text to wrap on narrow screens and prove readable spacing.
- Second unordered item with **bold content** and inline \`values\`.
- Third unordered item with a nested-looking phrase but no actual nested list.

1. First ordered item.
2. Second ordered item.
3. Third ordered item.

## Task List

- [x] Completed renderer case.
- [ ] Pending renderer case.

## Quote

> This blockquote should keep its contrast, left border, spacing, and readable line height on desktop and phone widths.

## Table

| Feature | Expected result |
| --- | --- |
| Tags | Visible chips in the header |
| Cover image | Ambient cover art appears above content |
| Long table text | Scrolls or wraps without causing page-level horizontal overflow |

## Code

\`\`\`ts
const rendererCase = 'blog';
const shouldStayStandardMarkdownOnly = true;
\`\`\`

\`\`\`layerone
BLOG TEST SIGNAL :: STANDARD MARKDOWN ONLY
\`\`\`

## Image

![Blog placeholder image](/blog/placeholder.png)

## Dialogue And Thinking

"This quoted sentence should receive dialogue styling."

Text can include <thinking>short inline thinking</thinking> without breaking the paragraph.

<thinking>
This standalone thinking block should render as a larger styled block.
</thinking>

## Final Paragraph

The last paragraph checks bottom spacing and confirms the post can end normally after rich content.
`,
  rawMarkdown: '',
};

blogRendererTestPost.rawMarkdown = blogRendererTestPost.content;

export const loreRendererTestPost: ParsedPost = {
  filename: 'lore-renderer-test.md',
  metadata: {
    title: 'Lore Renderer Test Post',
    summary:
      'A hidden fixture for checking lore metadata, lore image tokens, species cards, story styling, and markdown rendering.',
    tags: ['lore', 'real-moments', 'test-fixture', 'luna'],
    cover_image: '/lore/luna-lux-maboroshi.png',
    date: '2026-05-25',
    author: 'Midori AI Test Fixture',
    game: 'real-moments',
    story_order: 9999,
    episode_label: 'Renderer Test',
  },
  content: `# Lore Markdown Coverage

This page is a hidden renderer fixture for lore posts. It intentionally includes lore-only token systems that normal blog posts should not rely on.

"Dialogue should receive the lore dialogue treatment," Luna said, checking the renderer output.

## Metadata Expectations

- The page should render as a lore post.
- Tags should include lore, game, character, and fixture labels.
- Story metadata should not require this fixture to appear in normal lore lists.

## Standard Markdown

| Lore system | Expected result |
| --- | --- |
| Markdown table | Remains readable at phone widths |
| Links | [Back to lore](/lore) keeps normal link styling |
| Inline code | \`story_order: 9999\` remains legible |

> This blockquote checks lore prose styling in the same renderer used by real lore posts.

\`\`\`layerone
LORE TEST SIGNAL :: TOKEN SYSTEMS ACTIVE
\`\`\`

## Standard Markdown Image

![WEAVE cover image](/lore/weave.png)

## Lore Image Token

{{image: /lore/the-story-luna-midori/01-veiled-crossing-first-shift.png}}

## Species Card Tokens

{{speciescard: /lore/w-e-a-v-e}}

{{speciescard: /lore/echo-poindexter}} {{speciescard: /lore/luna-midori}} {{speciescard: /lore/leo-midori}}

{{speciescard: /lore/luna-midori}} {{speciescard: /lore/leo-midori}}

## Thinking Styles

The line can hold <thinking>inline private-style thought</thinking> inside prose.

<thinking>
This standalone thinking block should remain visually distinct from normal narration.
</thinking>

## Closing Check

The lore fixture should prove token embeds, markdown media, dialogue styling, and long-form story typography can coexist on one page.
`,
  rawMarkdown: '',
};

loreRendererTestPost.rawMarkdown = loreRendererTestPost.content;
