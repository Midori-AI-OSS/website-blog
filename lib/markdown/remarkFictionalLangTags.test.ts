import { describe, expect, test } from 'bun:test';
import type { Content, Root } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import remarkFictionalLangTags from './remarkFictionalLangTags';

interface FictionalLangTestNode {
  type: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  children?: Content[];
  value?: string;
}

async function parseAndTransform(markdown: string): Promise<Root> {
  const tree = unified().use(remarkParse).parse(markdown);
  return (await unified().use(remarkFictionalLangTags).run(tree)) as Root;
}

function findNodes(root: Root, type: string): FictionalLangTestNode[] {
  const results: FictionalLangTestNode[] = [];

  function walk(node: unknown) {
    const n = node as FictionalLangTestNode;
    if (n.type === type) {
      results.push(n);
    }
    if (n.children) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(root);
  return results;
}

function collectText(root: Root): string {
  let result = '';

  function walk(node: unknown) {
    const n = node as FictionalLangTestNode;
    if (n.value !== undefined) {
      result += n.value;
    }
    if (n.children) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(root);
  return result;
}

describe('remarkFictionalLangTags', () => {
  test('wraps celestial content in a fictionalLang node', async () => {
    const tree = await parseAndTransform('<celestial>hello</celestial>');
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(1);
    expect(langNodes[0]?.data?.hName).toBe('span');
    expect(langNodes[0]?.data?.hProperties).toEqual({ 'data-lang': 'celestial' });
  });

  test('wraps abyssal content in a fictionalLang node', async () => {
    const tree = await parseAndTransform('<abyssal>dark words</abyssal>');
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(1);
    expect(langNodes[0]?.data?.hProperties).toEqual({ 'data-lang': 'abyssal' });
  });

  test('handles reveal mode', async () => {
    const tree = await parseAndTransform('<celestial reveal>secret</celestial>');
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(1);
    expect(langNodes[0]?.data?.hProperties).toEqual({
      'data-lang': 'celestial',
      'data-reveal': 'true',
    });
  });

  test('adds quotes around content that lacks them', async () => {
    const tree = await parseAndTransform('<celestial>hello</celestial>');
    const text = collectText(tree);

    expect(text).toContain('"hello"');
  });

  test('does not double-quote already quoted content', async () => {
    const tree = await parseAndTransform('<celestial>"already quoted"</celestial>');
    const text = collectText(tree);

    const quoteCount = (text.match(/"/g) ?? []).length;
    expect(quoteCount).toBe(2);
  });

  test('drops stray closing tags without an opener', async () => {
    const tree = await parseAndTransform('</celestial>');
    const htmlNodes = findNodes(tree, 'html');

    expect(htmlNodes.length).toBe(0);
  });

  test('leaves content after an unmatched opener intact', async () => {
    const tree = await parseAndTransform('<celestial>unclosed text');
    const text = collectText(tree);

    expect(text).toContain('unclosed text');
  });

  test('finds closing tag nested inside a strong element', async () => {
    const tree = await parseAndTransform(
      '<celestial>outer text **inner text</celestial> more bold**',
    );
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(1);
    expect(langNodes[0]?.data?.hProperties).toEqual({ 'data-lang': 'celestial' });
    const text = collectText(tree);
    expect(text).toContain('outer text');
    expect(text).toContain('inner text');
  });

  test('preserves remaining content in parent node after nested closing tag split', async () => {
    const tree = await parseAndTransform('<celestial>start **bold</celestial> remaining bold**');
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(1);
    const text = collectText(tree);
    expect(text).toContain('start');
    expect(text).toContain('bold');
    expect(text).toContain('remaining bold');
  });

  test('finds closing tag nested inside emphasis', async () => {
    const tree = await parseAndTransform('<celestial>words *italic</celestial> more italic*');
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(1);
    expect(langNodes[0]?.data?.hProperties).toEqual({ 'data-lang': 'celestial' });
  });

  test('handles nested tags with reveal mode correctly', async () => {
    const tree = await parseAndTransform('<celestial reveal>text **bold</celestial> after**');
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(1);
    expect(langNodes[0]?.data?.hProperties).toEqual({
      'data-lang': 'celestial',
      'data-reveal': 'true',
    });
  });

  test('processes lang tags inside a paragraph correctly', async () => {
    const tree = await parseAndTransform('Hello <celestial>world</celestial> today');
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(1);
    const text = collectText(tree);
    expect(text).toContain('Hello');
    expect(text).toContain('world');
    expect(text).toContain('today');
  });

  test('handles multiple lang tags in the same markdown', async () => {
    const tree = await parseAndTransform(
      '<celestial>first</celestial> and <abyssal>second</abyssal>',
    );
    const langNodes = findNodes(tree, 'fictionalLang');

    expect(langNodes.length).toBe(2);
    expect(langNodes[0]?.data?.hProperties).toEqual({ 'data-lang': 'celestial' });
    expect(langNodes[1]?.data?.hProperties).toEqual({ 'data-lang': 'abyssal' });
  });
});
