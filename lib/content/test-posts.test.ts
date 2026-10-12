import { describe, expect, test } from 'bun:test';
import { loreTokenTestPost } from './test-posts';

function getSpeciesCardGroupSizes(markdown: string): number[] {
  return markdown
    .split(/\n{2,}/)
    .map((paragraph) => [...paragraph.matchAll(/\{\{\s*speciescard\s*:/gi)].length)
    .filter((count) => count > 0);
}

describe('Lore token test fixture', () => {
  test('demonstrates one-card, two-card, and three-card groups', () => {
    expect(getSpeciesCardGroupSizes(loreTokenTestPost.content)).toEqual([1, 2, 3]);
  });

  test('links each species card to its versioned fake chart', () => {
    const { content } = loreTokenTestPost;

    expect(content).toContain(
      '[W.E.A.V.E.](/species-care/species-card/ar/de/duisburg/sylvomech/luna/weave/sylv-logic-prov?version=prov-v0.17)',
    );
    expect(content).toContain(
      '[Echo](/species-care/species-card/ar/farmington/poindexter/echo/1003/hum-mg-tch/echo-prov?version=prov-v0.16)',
    );
    expect(content).toContain(
      '[Luna](/species-care/species-card/ar/sapporo/midori/luna/0121/aas-tch-luminumbra-prov?version=prov-v0.17)',
    );
    expect(content).toContain(
      '[Leo](/species-care/species-card/ar/sapporo/midori/leo/0121/aas-tch-luminumbra-prov?version=prov-v0.17)',
    );
  });
});
