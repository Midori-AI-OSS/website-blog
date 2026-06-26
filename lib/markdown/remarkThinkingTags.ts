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

    if (isHtml(child)) {
      const combinedMatch = COMBINED_THINKING_BLOCK.exec(child.value.trim());
      if (combinedMatch) {
        const innerContent = combinedMatch[1] ?? '';
        if (!innerContent.trim()) {
          continue;
        }
        const innerTree = unified().use(remarkParse).parse(innerContent);
        const innerChildren = innerTree.children as Content[];
        for (const innerChild of innerChildren) {
          if (isParentContent(innerChild)) {
            transformParent(innerChild as Parent);
          }
        }
        transformedChildren.push(createThinkingNode('block', innerChildren));
        continue;
      }

      const prefixMatch = OPENING_THINKING_PREFIX.exec(child.value.trim());
      if (prefixMatch) {
        const trailingContent = prefixMatch[1]?.trim();
        const closingResult = findClosingTag(parent.children as Content[], index);

        if (closingResult === -1) {
          if (trailingContent) {
            const innerTree = unified().use(remarkParse).parse(trailingContent);
            const innerChildren = innerTree.children as Content[];
            for (const innerChild of innerChildren) {
              if (isParentContent(innerChild)) {
                transformParent(innerChild as Parent);
              }
            }
            transformedChildren.push(createThinkingNode('block', innerChildren));
          }
          continue;
        }

        let innerChildren: Content[];
        let skipTo: number;

        if (typeof closingResult === 'number') {
          innerChildren = (parent.children as Content[]).slice(index + 1, closingResult);
          skipTo = closingResult;
        } else {
          const { outerIndex, innerIndex } = closingResult;
          const outerNode = parent.children[outerIndex] as Content & Parent;
          innerChildren = [
            ...(parent.children as Content[]).slice(index + 1, outerIndex),
            ...outerNode.children.slice(0, innerIndex),
          ];
          outerNode.children.splice(innerIndex, 1);
          if (outerNode.children.length > 0) {
            transformedChildren.push(outerNode as unknown as Content);
          }
          skipTo = outerIndex;
        }

        if (trailingContent) {
          const innerTree = unified().use(remarkParse).parse(trailingContent);
          const parsedTrailing = innerTree.children as Content[];
          for (const innerChild of parsedTrailing) {
            if (isParentContent(innerChild)) {
              transformParent(innerChild as Parent);
            }
          }
          innerChildren = [...parsedTrailing, ...innerChildren];
        }

        for (const innerChild of innerChildren) {
          if (isParentContent(innerChild)) {
            transformParent(innerChild as Parent);
          }
        }

        transformedChildren.push(createThinkingNode('block', innerChildren));
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
        transformedChildren.push(createThinkingNode(variant, innerChildren));
        index = closingResult;
        continue;
      }

      const { outerIndex, innerIndex } = closingResult;
      const outerNode = parent.children[outerIndex] as Content & Parent;

      const innerChildren: Content[] = [
        ...(parent.children as Content[]).slice(index + 1, outerIndex),
        ...outerNode.children.slice(0, innerIndex),
      ];

      outerNode.children.splice(innerIndex, 1);
      if (outerNode.children.length > 0) {
        transformedChildren.push(outerNode as unknown as Content);
      }

      const isStandalone = parentIsParagraph && isOnlyContentInParent(parent, index, outerIndex);
      const variant = !parentIsParagraph || isStandalone ? 'block' : 'inline';
      transformedChildren.push(createThinkingNode(variant, innerChildren));
      index = outerIndex;
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
