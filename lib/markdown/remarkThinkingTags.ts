import type { Content, Html, Parent, Root } from 'mdast';
import remarkParse from 'remark-parse';
import { type Plugin, unified } from 'unified';

const OPENING_THINKING_TAG = /^<thinking\s*>$/i;
const CLOSING_THINKING_TAG = /^<\/thinking\s*>$/i;

const COMBINED_THINKING_BLOCK = /^<thinking\s*>([\s\S]*?)<\/thinking\s*>$/i;

const OPENING_THINKING_PREFIX = /^<thinking\s*>([\s\S]*)$/i;

interface ThinkingNode extends Parent {
  type: 'thinking';
  data: {
    hName: 'span';
    hProperties: {
      'data-thinking': 'inline' | 'block';
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

function isOpeningThinkingTag(node: Content): boolean {
  return isHtml(node) && OPENING_THINKING_TAG.test(node.value.trim());
}

function isClosingThinkingTag(node: Content): boolean {
  return isHtml(node) && CLOSING_THINKING_TAG.test(node.value.trim());
}

function createThinkingNode(variant: 'inline' | 'block', children: Content[]): ThinkingNode {
  return {
    type: 'thinking',
    data: {
      hName: 'span',
      hProperties: {
        'data-thinking': variant,
      },
    },
    children,
  };
}

function transformContentChildren(children: Content[]): void {
  for (const child of children) {
    if (isParentContent(child)) {
      transformParent(child);
    }
  }
}

function isOnlyContentInParent(
  parent: Parent,
  openingIndex: number,
  closingIndex: number,
): boolean {
  for (let i = 0; i < parent.children.length; i++) {
    if (i >= openingIndex && i <= closingIndex) continue;
    const child = parent.children[i] as Content | undefined;
    if (!child) continue;
    if (child.type === 'text' && child.value?.trim() !== '') return false;
    if (child.type !== 'text') return false;
  }
  return true;
}

interface NestedClosingTag {
  outerIndex: number;
  innerIndex: number;
}

function findClosingTag(children: Content[], startIndex: number): number | NestedClosingTag {
  for (let index = startIndex + 1; index < children.length; index += 1) {
    const child = children[index] as Content | undefined;
    if (!child) continue;

    if (isClosingThinkingTag(child)) {
      return index;
    }

    if (isParentContent(child)) {
      for (let j = 0; j < child.children.length; j += 1) {
        const nested = child.children[j] as Content | undefined;
        if (nested && isClosingThinkingTag(nested)) {
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
  const transformedChildren: Array<Content | ThinkingNode> = [];
  const parentIsParagraph = parent.type === 'paragraph';

  for (let index = 0; index < parent.children.length; index += 1) {
    const child = parent.children[index] as Content | undefined;

    if (!child) {
      continue;
    }

    if (isHtml(child)) {
      const combinedMatch = COMBINED_THINKING_BLOCK.exec(child.value.trim());
      if (combinedMatch) {
        const innerContent = combinedMatch[1] ?? '';
        if (!innerContent.trim()) {
          continue;
        }
        const innerTree = unified().use(remarkParse).parse(innerContent);
        const innerChildren = innerTree.children as Content[];
        transformContentChildren(innerChildren);
        transformedChildren.push(createThinkingNode('block', innerChildren));
        continue;
      }

      const prefixMatch = OPENING_THINKING_PREFIX.exec(child.value.trim());
      const trailingContent = prefixMatch?.[1]?.trim();
      if (prefixMatch && trailingContent) {
        const closingResult = findClosingTag(parent.children as Content[], index);

        if (closingResult === -1) {
          const innerTree = unified().use(remarkParse).parse(trailingContent);
          const innerChildren = innerTree.children as Content[];
          transformContentChildren(innerChildren);
          transformedChildren.push(createThinkingNode('block', innerChildren));
          continue;
        }

        let innerChildren: Content[];
        let skipTo: number;
        let remainingOuterNode: (Content & Parent) | null = null;

        if (typeof closingResult === 'number') {
          innerChildren = (parent.children as Content[]).slice(index + 1, closingResult);
          skipTo = closingResult;
        } else {
          const splitResult = splitNestedClosingTag(parent, index, closingResult);
          innerChildren = splitResult.innerChildren;
          remainingOuterNode = splitResult.remainingOuterNode;
          skipTo = closingResult.outerIndex;
        }

        const innerTree = unified().use(remarkParse).parse(trailingContent);
        const parsedTrailing = innerTree.children as Content[];
        transformContentChildren(parsedTrailing);
        innerChildren = [...parsedTrailing, ...innerChildren];

        transformContentChildren(innerChildren);

        transformedChildren.push(createThinkingNode('block', innerChildren));
        if (remainingOuterNode) {
          transformParent(remainingOuterNode);
          transformedChildren.push(remainingOuterNode as unknown as Content);
        }
        index = skipTo;
        continue;
      }
    }

    if (isOpeningThinkingTag(child)) {
      const closingResult = findClosingTag(parent.children as Content[], index);

      if (closingResult === -1) {
        continue;
      }

      if (typeof closingResult === 'number') {
        const innerChildren = (parent.children as Content[]).slice(index + 1, closingResult);
        const isStandalone =
          parentIsParagraph && isOnlyContentInParent(parent, index, closingResult);
        const variant = !parentIsParagraph || isStandalone ? 'block' : 'inline';
        transformContentChildren(innerChildren);
        transformedChildren.push(createThinkingNode(variant, innerChildren));
        index = closingResult;
        continue;
      }

      const { outerIndex, innerIndex } = closingResult;
      const isStandalone = parentIsParagraph && isOnlyContentInParent(parent, index, outerIndex);
      const variant = !parentIsParagraph || isStandalone ? 'block' : 'inline';
      const { innerChildren, remainingOuterNode } = splitNestedClosingTag(parent, index, {
        outerIndex,
        innerIndex,
      });

      transformContentChildren(innerChildren);
      transformedChildren.push(createThinkingNode(variant, innerChildren));
      if (remainingOuterNode) {
        transformParent(remainingOuterNode);
        transformedChildren.push(remainingOuterNode as unknown as Content);
      }
      index = outerIndex;
      continue;
    }

    if (isClosingThinkingTag(child)) {
      continue;
    }

    if (isParentContent(child)) {
      transformParent(child);
    }
    transformedChildren.push(child);
  }

  parent.children = transformedChildren as Parent['children'];
}

const remarkThinkingTags: Plugin<[], Root> = () => {
  return (tree) => {
    transformParent(tree);
  };
};

export default remarkThinkingTags;
