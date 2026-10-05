import { describe, expect, test } from 'bun:test';
import { replaceLoreImageTokens } from './postMarkdown';

describe('postMarkdown image tokens', () => {
  test('keeps fingerprints in image URLs without adding them to alt text', () => {
    const fingerprint = 'a'.repeat(64);
    const markdown = replaceLoreImageTokens(`{{image: /lore/story cover.png?v=${fingerprint}}}`);

    expect(markdown).toContain(
      `![story cover](/api/lore-images/story%20cover.png?v=${fingerprint}`,
    );
    expect(markdown).not.toContain(`story cover?v=${fingerprint}`);
  });
});
