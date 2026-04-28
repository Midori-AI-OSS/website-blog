import type { Content, Element, Root, Text } from 'hast';
import type { Plugin } from 'unified';

const QUOTE_CHAR = '"';
const HYPHEN_CHAR = '-';
const CURLY_DOUBLE_QUOTES = /[“”]/g;
const EM_DASH = /—/g;

const DIALOGUE_EXCLUDED_TAGS = new Set(['blockquote', 'code', 'pre', 'script', 'style']);
const NORMALIZE_EXCLUDED_TAGS = new Set(['code', 'pre', 'script', 'style']);

interface TraverseContext {
  dialogueExcluded: boolean;
  normalizeExcluded: boolean;
}

function isElement(node: Content): node is Element {
  return node.type === 'element';
}

function isText(node: Content): node is Text {
  return node.type === 'text';
}

function normalizeText(value: string): string {
  return value
    .replace(CURLY_DOUBLE_QUOTES, QUOTE_CHAR)
    .replace(EM_DASH, HYPHEN_CHAR);
}

function createText(value: string): Text {
  return { type: 'text', value };
}

function createDialogueSpan(children: Content[]): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: { 'data-dialogue': 'true' },
    children: children as Element['children'],
  };
}

function pushContent(target: Content[], node: Content): void {
  if (isText(node) && node.value.length === 0) {
    return;
  }

  target.push(node);
}

function wrapDialogue(children: Content[]): Content[] {
  const output: Content[] = [];
  let inDialogue = false;
  let dialogueBuffer: Content[] = [];

  const pushNode = (node: Content) => {
    if (inDialogue) {
      pushContent(dialogueBuffer, node);
      return;
    }

    pushContent(output, node);
  };

  for (const child of children) {
    if (!isText(child)) {
      pushNode(child);
      continue;
    }

    const value = child.value;
    if (value.length === 0) {
      continue;
    }

    let cursor = 0;

    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== QUOTE_CHAR) {
        continue;
      }

      const segment = value.slice(cursor, index);
      if (segment.length > 0) {
        pushNode(createText(segment));
      }

      const quoteNode = createText(QUOTE_CHAR);

      if (inDialogue) {
        pushContent(dialogueBuffer, quoteNode);
        if (dialogueBuffer.length > 0) {
          output.push(createDialogueSpan(dialogueBuffer));
        }
        dialogueBuffer = [];
        inDialogue = false;
      } else {
        inDialogue = true;
        pushContent(dialogueBuffer, quoteNode);
      }

      cursor = index + 1;
    }

    const trailing = value.slice(cursor);
    if (trailing.length > 0) {
      pushNode(createText(trailing));
    }
  }

  if (inDialogue && dialogueBuffer.length > 0) {
    output.push(...dialogueBuffer);
  }

  return output;
}

function transformChildren(children: Content[], context: TraverseContext): Content[] {
  const transformed: Content[] = [];

  for (const child of children) {
    if (isText(child)) {
      if (context.normalizeExcluded) {
        transformed.push(child);
      } else {
        transformed.push(createText(normalizeText(child.value)));
      }
      continue;
    }

    if (!isElement(child)) {
      transformed.push(child);
      continue;
    }

    const tagName = child.tagName.toLowerCase();
    const nextContext: TraverseContext = {
      dialogueExcluded: context.dialogueExcluded || DIALOGUE_EXCLUDED_TAGS.has(tagName),
      normalizeExcluded: context.normalizeExcluded || NORMALIZE_EXCLUDED_TAGS.has(tagName),
    };

    transformed.push({
      ...child,
      children: transformChildren(child.children as Content[], nextContext) as Element['children'],
    });
  }

  if (context.dialogueExcluded) {
    return transformed;
  }

  return wrapDialogue(transformed);
}

const rehypeDialogueQuotes: Plugin<[], Root> = () => {
  return (tree) => {
    tree.children = transformChildren(tree.children as Content[], {
      dialogueExcluded: false,
      normalizeExcluded: false,
    });
  };
};

export default rehypeDialogueQuotes;
