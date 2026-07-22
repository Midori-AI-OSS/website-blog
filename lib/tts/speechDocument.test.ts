import { describe, expect, test } from 'bun:test';
import { blogRendererTestPost, loreRendererTestPost } from '@/lib/content/test-posts';
import {
  deriveSpeechDocument,
  hashSpeechDocument,
  serializeSpeechDocumentForHash,
} from './speechDocument';

describe('deriveSpeechDocument', () => {
  test('keeps rendered prose while excluding non-spoken structures', () => {
    const document = deriveSpeechDocument(`
> **Disclaimer:** Standard opening copy.
> It spans lines.

# Hidden heading

First **paragraph** with "dialogue", <thinking>a thought</thinking>, <celestial>language</celestial>, and [a link](/x). It drops \`inline()\`.

> A retained quote.

- First list item.
- Second list item with ![an image](/image.png).

| Hidden | Table |
| --- | --- |
| no | speech |

\`\`\`ts
const hidden = true;
\`\`\`

\`\`\`layerone
DIGITAL   SIGNAL
ONLINE
\`\`\`

![Hidden image alt](/image.png)

{{speciescard: lore/w-e-a-v-e}}
`);

    expect(document.text).toBe(
      'First paragraph with "dialogue", a thought, "language", and a link. It drops . A retained quote. First list item. Second list item with . DIGITAL SIGNAL ONLINE',
    );
    expect(
      document.paragraphs.map((paragraph) => document.text.slice(paragraph.start, paragraph.end)),
    ).toEqual([
      'First paragraph with "dialogue", a thought, "language", and a link. It drops .',
      'A retained quote.',
      'First list item.',
      'Second list item with .',
      'DIGITAL SIGNAL ONLINE',
    ]);
    expect(document.paragraphs.at(-1)?.kind).toBe('layerone');
  });

  test('normalizes all retained whitespace to single ASCII spaces and rendered punctuation', () => {
    const document = deriveSpeechDocument('One\tline — “quoted.”\ncontinued.\n\nNext\u00a0line.');

    expect(document.text).toBe('One line - "quoted." continued. Next line.');
    expect(document.paragraphs).toEqual([
      { start: 0, end: 31, kind: 'prose' },
      { start: 32, end: 42, kind: 'prose' },
    ]);
  });

  test('only removes a disclaimer when it is the opening substantive block', () => {
    const document = deriveSpeechDocument(
      'Opening prose.\n\n> **Disclaimer:** This later quote is content.',
    );

    expect(document.text).toBe('Opening prose. Disclaimer: This later quote is content.');
  });

  test('produces stable SHA-256 content identities that include paragraph kinds', async () => {
    const prose = deriveSpeechDocument('Same text.');
    const layerone = deriveSpeechDocument('```layerone\nSame text.\n```');

    expect(serializeSpeechDocumentForHash(prose)).not.toBe(
      serializeSpeechDocumentForHash(layerone),
    );
    expect(await hashSpeechDocument(prose)).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashSpeechDocument(prose)).toBe(await hashSpeechDocument(prose));
  });

  test('covers both hidden renderer fixtures with the same prose-first rules', () => {
    const blog = deriveSpeechDocument(blogRendererTestPost.content);
    const lore = deriveSpeechDocument(loreRendererTestPost.content);

    for (const document of [blog, lore]) {
      expect(document.text).not.toContain('opening fixture disclaimer');
      expect(document.text).not.toContain('Markdown Coverage');
      expect(document.text).not.toContain('THIS ORDINARY CODE MUST NOT BE SPOKEN');
      expect(document.paragraphs.some((paragraph) => paragraph.kind === 'layerone')).toBe(true);
    }

    expect(blog.text).toContain('This blockquote should keep its contrast');
    expect(blog.text).toContain('short inline thinking');
    expect(blog.text).toContain('"text"');
    expect(lore.text).toContain('Dialogue should receive the lore dialogue treatment');
    expect(lore.text).toContain('inline private-style thought');
    expect(lore.text).not.toContain('speciescard');
  });
});
