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

interface NestedClosingTag {
  outerIndex: number;
  innerIndex: number;
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

function transformContentChildren(children: Content[]): void {
  for (const child of children) {
    if (isParentContent(child)) {
      transformParent(child);
    }
  }
}

function findClosingTag(
  children: Content[],
  startIndex: number,
  lang: string,
): number | NestedClosingTag {
  for (let index = startIndex + 1; index < children.length; index += 1) {
    const child = children[index] as Content | undefined;
    if (!child) continue;

    if (isMatchingClosingTag(child, lang)) {
      return index;
    }

    if (isParentContent(child)) {
      for (let j = 0; j < child.children.length; j += 1) {
        const nested = child.children[j] as Content | undefined;
        if (nested && isMatchingClosingTag(nested, lang)) {
          return { outerIndex: index, innerIndex: j };
        }
      }
    }
  }

  return -1;
}

function splitNestedClosingTag(
  parent: Parent | Root,
  openingIndex: number,
  closingTag: NestedClosingTag,
): {
  innerChildren: Content[];
  remainingOuterNode: (Content & Parent) | null;
} {
  const { outerIndex, innerIndex } = closingTag;
  const outerNode = parent.children[outerIndex] as Content & Parent;
  const childrenBeforeClosing = outerNode.children.slice(0, innerIndex);
  const innerOuterNode =
    childrenBeforeClosing.length > 0
      ? ({ ...outerNode, children: childrenBeforeClosing } as Content)
      : null;
  const innerChildren = [
    ...(parent.children as Content[]).slice(openingIndex + 1, outerIndex),
    ...(innerOuterNode ? [innerOuterNode] : []),
  ];

  outerNode.children = outerNode.children.slice(innerIndex + 1);

  return {
    innerChildren,
    remainingOuterNode: outerNode.children.length > 0 ? outerNode : null,
  };
}

function transformParent(parent: Parent | Root): void {
  const transformedChildren: Array<Content | FictionalLangNode> = [];

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

      const closingResult = findClosingTag(parent.children as Content[], index, parsed.lang);

      if (closingResult === -1) {
        continue;
      }

      if (typeof closingResult === 'number') {
        const innerChildren = (parent.children as Content[]).slice(index + 1, closingResult);
        transformContentChildren(innerChildren);
        const addQuotes = shouldAddQuotes(innerChildren);
        if (addQuotes) {
          transformedChildren.push({ type: 'text', value: '"' } as Content);
        }
        transformedChildren.push(
          createFictionalLangNode(
            parsed.lang as 'celestial' | 'abyssal',
            parsed.reveal,
            innerChildren,
          ),
        );
        if (addQuotes) {
          transformedChildren.push({ type: 'text', value: '"' } as Content);
        }
        index = closingResult;
        continue;
      }

      const { innerChildren, remainingOuterNode } = splitNestedClosingTag(
        parent,
        index,
        closingResult,
      );

      transformContentChildren(innerChildren);
      const addQuotes = shouldAddQuotes(innerChildren);
      if (addQuotes) {
        transformedChildren.push({ type: 'text', value: '"' } as Content);
      }
      transformedChildren.push(
        createFictionalLangNode(
          parsed.lang as 'celestial' | 'abyssal',
          parsed.reveal,
          innerChildren,
        ),
      );
      if (addQuotes) {
        transformedChildren.push({ type: 'text', value: '"' } as Content);
      }
      if (remainingOuterNode) {
        transformParent(remainingOuterNode);
        transformedChildren.push(remainingOuterNode as Content);
      }
      index = closingResult.outerIndex;
      continue;
    }

    if (
      isHtml(child) &&
      (CLOSING_CELESTIAL_TAG.test(child.value.trim()) ||
        CLOSING_ABYSSAL_TAG.test(child.value.trim()))
    ) {
      continue;
    }

    if (isParentContent(child)) {
      transformParent(child);
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
