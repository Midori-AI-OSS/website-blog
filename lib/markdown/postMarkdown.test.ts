import { describe, expect, test } from 'bun:test';
import { replacePostImageTokens } from './postMarkdown';

describe('postMarkdown image tokens', () => {
  test('keeps fingerprints in image URLs without adding them to alt text', () => {
    const fingerprint = 'a'.repeat(64);
    const markdown = replacePostImageTokens(`{{image: /lore/story cover.png?v=${fingerprint}}}`);

    expect(markdown).toContain(
      `![story cover](/api/lore-images/story%20cover.png?v=${fingerprint}`,
    );
    expect(markdown).not.toContain(`story cover?v=${fingerprint}`);
  });

  test('resolves shared image tokens through the shared image API', () => {
    const markdown = replacePostImageTokens('{{image: /shared/the-story-luna-midori/scene.webp}}');

    expect(markdown).toContain('![scene](/api/shared-images/the-story-luna-midori/scene.webp');
  });
});
