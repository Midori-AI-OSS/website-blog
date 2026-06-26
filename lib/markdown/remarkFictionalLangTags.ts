import type { Content, Html, Parent, Root } from 'mdast';
import type { Plugin } from 'unified';

const OPENING_LANG_TAG = /^<(celestial|abyssal)(\s+reveal)?\s*>$/i;
const CLOSING_CELESTIAL_TAG = /^<\/celestial\s*>$/i;
const CLOSING_ABYSSAL_TAG = /^<\/abyssal\s*>$/i;

function getClosingRegex(lang: string): RegExp {
  if (lang.toLowerCase() === 'celestial') return CLOSING_CELESTIAL_TAG;
  return CLOSING_ABYSSAL_TAG;
}

interface FictionalLangNode extends Parent {
  type: 'fictionalLang';
  data: {
    hName: 'span';
    hProperties: {
      'data-lang': 'celestial' | 'abyssal';
      'data-reveal'?: 'true';
    };
  };
  children: Content[];
}

function isParentContent(node: Content): node is Content & Parent {
  return Array.isArray((node as Parent).children);
}

function isHtml(node: Content): node is Html {
  return node.type === 'html';
}

function isOpeningLangTag(node: Content): boolean {
  if (!isHtml(node)) return false;
  return OPENING_LANG_TAG.test(node.value.trim());
}

function parseOpeningTag(node: Content): { lang: string; reveal: boolean } | null {
  if (!isHtml(node)) return null;
  const match = OPENING_LANG_TAG.exec(node.value.trim());
  if (!match) return null;
  return {
    lang: match[1] ?? '',
    reveal: typeof match[2] === 'string' && /\breveal\b/i.test(match[2]),
  };
}

function isMatchingClosingTag(node: Content, lang: string): boolean {
  if (!isHtml(node)) return false;
  return getClosingRegex(lang).test(node.value.trim());
}

function createFictionalLangNode(
  lang: 'celestial' | 'abyssal',
  reveal: boolean,
  children: Content[],
): FictionalLangNode {
  const hProperties: { 'data-lang': 'celestial' | 'abyssal'; 'data-reveal'?: 'true' } = {
    'data-lang': lang,
  };
  if (reveal) {
    hProperties['data-reveal'] = 'true';
  }
  return {
    type: 'fictionalLang',
    data: {
      hName: 'span',
      hProperties,
    },
    children,
  };
}

function getCombinedText(children: Content[]): string {
  let result = '';
  for (const child of children) {
    if (child.type === 'text') result += child.value;
    else if ('children' in child) result += getCombinedText(child.children as Content[]);
  }
  return result;
}

function shouldAddQuotes(children: Content[]): boolean {
  const text = getCombinedText(children).trim();
  if (text.length === 0) return true;
  return !(text.startsWith('"') && text.endsWith('"'));
}

function wrapInQuotes(children: Content[]): Content[] {
  if (!shouldAddQuotes(children)) return children;
  return [
    { type: 'text', value: '"' } as Content,
    ...children,
    { type: 'text', value: '"' } as Content,
  ];
}

function findClosingTag(children: Content[], startIndex: number, lang: string): number {
  for (let index = startIndex + 1; index < children.length; index += 1) {
    const child = children[index];
    if (child && isMatchingClosingTag(child, lang)) {
      return index;
    }
  }
  return -1;
}

function transformParent(parent: Parent | Root): void {
  const transformedChildren: Array<Content | FictionalLangNode> = [];

  for (const child of parent.children as Content[]) {
    if (isParentContent(child)) {
      transformParent(child);
    }
  }

  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index] as Content | undefined;

    if (!child) {
      continue;
    }

    if (isOpeningLangTag(child)) {
      const parsed = parseOpeningTag(child);
      if (!parsed) {
        continue;
      }

      const closingIndex = findClosingTag(parent.children as Content[], index, parsed.lang);

      if (closingIndex === -1) {
        continue;
      }

      const innerChildren = (parent.children as Content[]).slice(index + 1, closingIndex);
      transformedChildren.push(
        createFictionalLangNode(
          parsed.lang as 'celestial' | 'abyssal',
          parsed.reveal,
          wrapInQuotes(innerChildren),
        ),
      );
      index = closingIndex;
      continue;
    }

    // Drop stray closing tags (any lang)
    if (
      isHtml(child) &&
      (CLOSING_CELESTIAL_TAG.test(child.value.trim()) ||
        CLOSING_ABYSSAL_TAG.test(child.value.trim()))
    ) {
      continue;
    }

    transformedChildren.push(child);
  }

  parent.children = transformedChildren as Parent['children'];
}

const remarkFictionalLangTags: Plugin<[], Root> = () => {
  return (tree) => {
    transformParent(tree);
  };
};

export default remarkFictionalLangTags;
