import { type ParsedPost, parsePost } from '@/lib/blog/parser';

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
  content: `> **Disclaimer:** This opening fixture disclaimer is visible but must not be spoken by TTS.

# Blog Markdown Coverage

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
*BLOG TEST SIGNAL* :: STANDARD MARKDOWN ONLY
\`\`\`

## Image

![Blog placeholder image](/blog/placeholder.png)

## Dialogue And Thinking

"This quoted sentence should receive dialogue styling."

Text can include <thinking>short inline thinking</thinking> without breaking the paragraph.

<thinking>
This standalone thinking block should render as a larger styled block.
</thinking>

## Fictional Language Tokens

<celestial>text</celestial>

<celestial:R>A tag that should typewriter translate on hover</celestial:R>

<abyssal>text</abyssal>

<abyssal:R>A tag that should typewriter translate on hover</abyssal:R>

TTS volume comparison: <celestial>softer Celestial bells</celestial>, followed by <abyssal>stronger Abyssal whispers</abyssal>.

TTS fixture: <celestial:R>understood Celestial uses the normal voice</celestial:R>; <abyssal:R>understood Abyssal uses speech with a quiet whisper</abyssal:R>.

When tags are mismatched or dropped, readers should still see the <celestial>text just fine.

## Final Paragraph

The last paragraph checks bottom spacing and confirms the post can end normally after rich content.
`,
  rawMarkdown: '',
};

blogRendererTestPost.rawMarkdown = blogRendererTestPost.content;

function makePostVariant(
  post: ParsedPost,
  filename: string,
  summary: string,
  content: string,
  title?: string,
): ParsedPost {
  return {
    ...post,
    filename,
    metadata: { ...post.metadata, ...(title ? { title } : {}), summary },
    content,
    rawMarkdown: content,
  };
}

const blogLanguageMarkupContent = `# Blog Fictional Language Display

This post shows how fictional languages appear inside a Blog story.

## Celestial

<celestial>Celestial letters in the inherited font</celestial>

<celestial:R>Hover over this understood phrase to see its readable form.</celestial>

## Abyssal

<abyssal>Abyssal letters in the inherited font</abyssal>

<abyssal:R>Hover over this understood phrase to see its readable form.</abyssal>
`;

export const blogLanguageMarkupTestPost = makePostVariant(
  blogRendererTestPost,
  'blog-language-markup-test.md',
  'Examples of Celestial and Abyssal text and their hover reveal behavior.',
  blogLanguageMarkupContent,
  'Blog Fictional Language Display',
);

const blogTtsContent = `# Blog Audio Reading

Normal narration plays as speech.

"This quoted sentence is dialogue." The player highlights words as the reading continues.

Unmarked Celestial is not understood: <celestial>Celestial bells answer here.</celestial>

Unmarked Abyssal is not understood: <abyssal>Abyssal whispers answer here.</abyssal>

Understood Celestial uses speech: <celestial:R>We understand these Celestial words.</celestial>

Understood Abyssal uses speech with a quiet whisper: <abyssal:R>We understand these Abyssal words.</abyssal>
`;

export const blogTtsTestPost = makePostVariant(
  blogRendererTestPost,
  'blog-tts-test.md',
  'A Blog reading with normal speech, dialogue, and fictional-language audio.',
  blogTtsContent,
  'Blog Audio Reading',
);

const loreRendererTestPostMarkdown = `---
title: "W.E.A.V.E. System Log: Sangre y Lux Residua, <thinking>Deeper Contact: Under Evaluation</thinking>"
summary: "A hidden fixture for checking lore metadata, lore image tokens, species cards, story styling, and markdown rendering."
tags: [lore, real-moments, test-fixture, luna]
cover_image: /lore/luna-lux-maboroshi.png
date: 2026-05-25
author: Midori AI Test Fixture
game: real-moments
story_order: 9999
episode_label: Renderer Test
---

> **Disclaimer:** This opening fixture disclaimer is visible but must not be spoken by TTS.

# Lore Markdown Coverage

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

\`\`\`txt
THIS ORDINARY CODE MUST NOT BE SPOKEN
\`\`\`

\`\`\`layerone
*LORE TEST SIGNAL* :: TOKEN SYSTEMS ACTIVE
\`\`\`

## Standard Markdown Image

![WEAVE cover image](/lore/weave.png)

## Lore Image Token

{{image: /lore/the-story-luna-midori/01-veiled-crossing-first-shift.png}}

## Species Card Tokens

{{speciescard: /lore/w-e-a-v-e}}

{{speciescard: /lore/echo-poindexter}} {{speciescard: /lore/luna-midori}} {{speciescard: /lore/leo-midori}}

{{speciescard: /lore/luna-midori}} {{speciescard: /lore/leo-midori}}

## Debug Links

- [W.E.A.V.E.](/species-care/species-card/ar/de/duisburg/sylvomech/luna/weave/sylv-logic-prov?version=prov-v0.17)
- [Echo](/species-care/species-card/ar/farmington/poindexter/echo/1003/hum-mg-tch/echo-prov?version=prov-v0.16)
- [Luna](/species-care/species-card/ar/sapporo/midori/luna/0121/aas-tch-luminumbra-prov?version=prov-v0.17)
- [Leo](/species-care/species-card/ar/sapporo/midori/leo/0121/aas-tch-luminumbra-prov?version=prov-v0.17)

## Thinking Styles

The line can hold <thinking>inline private-style thought</thinking> inside prose.

<thinking>
This standalone thinking block should remain visually distinct from normal narration.
</thinking>

## Fictional Language Tokens

In a lore post we can also use <celestial>celestial script</celestial> and <abyssal>abyssal text</abyssal> inline.

The reveal variants typewriter translate too: <celestial:R>hover me</celestial:R> and <abyssal:R>hover me too</abyssal:R>.

TTS volume comparison: <celestial>softer Celestial bells</celestial>, followed by <abyssal>stronger Abyssal whispers</abyssal>.

TTS fixture: <celestial:R>understood Celestial uses the normal voice</celestial:R>; <abyssal:R>understood Abyssal uses speech with a quiet whisper</abyssal:R>.

Mismatched text like <celestial>opened but not closed and the stray <abyssal>text continues is readable.

## Closing Check

The lore fixture should prove token embeds, markdown media, dialogue styling, and long-form story typography can coexist on one page.
`;

export const loreRendererTestPost = parsePost(
  'lore-renderer-test.md',
  loreRendererTestPostMarkdown,
);

const loreMarkdownTestContent = `# Lore Story Layout

"This spoken line receives dialogue styling," Luna said.

## Story details

| Story element | What readers see |
| --- | --- |
| Metadata | The game, date, tags, and story order |
| Prose | Long-form paragraphs with story typography |

> This quoted block stays a blockquote and keeps its own spacing.

Inline emphasis, **strong text**, and *italic text* remain readable.
`;

export const loreMarkdownTestPost = makePostVariant(
  loreRendererTestPost,
  'lore-markdown-test.md',
  'A Lore story example with metadata, dialogue, tables, and standard Markdown.',
  loreMarkdownTestContent,
);

const loreTokenTestContent = `# Lore Image and Species Card Tokens

This story shows an embedded Lore image and species care cards.

## Lore image

{{image: /lore/the-story-luna-midori/01-veiled-crossing-first-shift.png}}

## Species cards

{{speciescard: /lore/w-e-a-v-e}}

{{speciescard: /lore/echo-poindexter}} {{speciescard: /lore/luna-midori}} {{speciescard: /lore/leo-midori}}

The cards above should sit together in a responsive group.
`;

export const loreTokenTestPost = makePostVariant(
  loreRendererTestPost,
  'lore-token-test.md',
  'A Lore story with an embedded image and species care card tokens.',
  loreTokenTestContent,
);

const loreLanguageMarkupContent = `# Lore Fictional Language Display

This story shows how fictional languages appear in a Lore post.

## Celestial

<celestial>Celestial letters in the inherited font</celestial>

<celestial:R>Hover over this understood phrase to see its readable form.</celestial>

## Abyssal

<abyssal>Abyssal letters in the inherited font</abyssal>

<abyssal:R>Hover over this understood phrase to see its readable form.</abyssal>
`;

export const loreLanguageMarkupTestPost = makePostVariant(
  loreRendererTestPost,
  'lore-language-markup-test.md',
  'Examples of Celestial and Abyssal text and their hover reveal behavior in Lore.',
  loreLanguageMarkupContent,
);

const loreTtsContent = `# Lore Audio Reading

Normal story narration plays as speech.

"This spoken line is highlighted as the reading continues," Luna said.

Unmarked Celestial is not understood: <celestial>Celestial bells answer here.</celestial>

Unmarked Abyssal is not understood: <abyssal>Abyssal whispers answer here.</abyssal>

Understood Celestial uses speech: <celestial:R>We understand these Celestial words.</celestial>

Understood Abyssal uses speech with a quiet whisper: <abyssal:R>We understand these Abyssal words.</abyssal>
`;

export const loreTtsTestPost = makePostVariant(
  loreRendererTestPost,
  'lore-tts-test.md',
  'A Lore reading with normal speech, dialogue, and fictional-language audio.',
  loreTtsContent,
);

export const lorePasswordGateTestPost = parsePost(
  'lore-password-gate-test.md',
  `---
title: "Password Gate Test"
summary: "A short Lore story used to demonstrate password-protected content."
tags: [lore, test-fixture]
cover_image: /lore/placeholder.png
date: 2026-05-25
author: Website Test Fixture
game: real-moments
password: lore-test
password_hint: "Use the word lore followed by -test."
---

# A protected story

This story becomes visible after the correct password is entered.
`,
);

if (
  loreRendererTestPost.metadata.title !==
    'W.E.A.V.E. System Log: Sangre y Lux Residua, Deeper Contact: Under Evaluation' ||
  !loreRendererTestPost.metadata.hasThinkingTitle ||
  JSON.stringify(loreRendererTestPost.metadata.titleSegments) !==
    JSON.stringify([
      { text: 'W.E.A.V.E. System Log: Sangre y Lux Residua,', isThinking: false },
      { text: 'Deeper Contact: Under Evaluation', isThinking: true },
    ])
) {
  throw new Error('Lore renderer test post thinking title parsing failed');
}
