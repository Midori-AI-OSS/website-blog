import type { Content, Html, Parent, Root } from 'mdast';
import type { Plugin } from 'unified';

const OPENING_THINKING_TAG = /^<thinking\s*>$/i;
const CLOSING_THINKING_TAG = /^<\/thinking\s*>$/i;

interface ThinkingNode extends Parent {
  type: 'thinking';
  data: {
    hName: 'span' | 'div';
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
      hName: variant === 'inline' ? 'span' : 'div',
      hProperties: {
        'data-thinking': variant,
      },
    },
    children,
  };
}

function findClosingTag(children: Content[], startIndex: number): number {
  for (let index = startIndex + 1; index < children.length; index += 1) {
    const child = children[index];
    if (child && isClosingThinkingTag(child)) {
      return index;
    }
  }

  return -1;
}

function transformParent(parent: Parent | Root): void {
  const transformedChildren: Array<Content | ThinkingNode> = [];
  const parentIsParagraph = parent.type === 'paragraph';

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

    if (isOpeningThinkingTag(child)) {
      const closingIndex = findClosingTag(parent.children as Content[], index);

      if (closingIndex === -1) {
        continue;
      }

      const innerChildren = (parent.children as Content[]).slice(index + 1, closingIndex);
      transformedChildren.push(createThinkingNode(parentIsParagraph ? 'inline' : 'block', innerChildren));
      index = closingIndex;
      continue;
    }

    if (isClosingThinkingTag(child)) {
      continue;
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
