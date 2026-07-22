import type { Content, Parent, Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { preparePostMarkdown } from '@/lib/markdown/postMarkdown';
import remarkFictionalLangTags from '@/lib/markdown/remarkFictionalLangTags';
import remarkThinkingTags from '@/lib/markdown/remarkThinkingTags';
import { splitMarkdownSpeciesCareTokens } from '@/lib/species-care/tokens';
import { TTS_OFFSET_UNIT, type TtsOffsetUnit } from '@/lib/tts/contract';

export { TTS_CACHE_VERSION, TTS_OFFSET_UNIT } from '@/lib/tts/contract';

export type SpeechParagraphKind = 'prose' | 'layerone';

export interface SpeechParagraph {
  /** UTF-16 code-unit index, matching String#slice and DOM Text offsets. */
  start: number;
  /** UTF-16 code-unit index, matching String#slice and DOM Text offsets. */
  end: number;
  kind: SpeechParagraphKind;
}

export interface SpeechDocument {
  text: string;
  offset_unit: TtsOffsetUnit;
  paragraphs: SpeechParagraph[];
}

const EXCLUDED_CONTAINER_TYPES = new Set(['heading', 'table', 'tableRow', 'tableCell']);
const ASTERISK = /\*/g;
const CURLY_DOUBLE_QUOTES = /[“”]/g;
const EM_DASH = /—/g;

function normalizeRenderedProse(value: string): string {
  return value
    .replace(ASTERISK, '')
    .replace(CURLY_DOUBLE_QUOTES, '"')
    .replace(EM_DASH, '-')
    .replace(/\s+/gu, ' ')
    .trim();
}

function normalizeLayerone(value: string): string {
  return value.replace(ASTERISK, '').replace(/\s+/gu, ' ').trim();
}

function isParent(node: Content | Root): node is (Content | Root) & Parent {
  return Array.isArray((node as Parent).children);
}

function inlineText(node: Content): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'break') return ' ';
  if (node.type === 'inlineCode' || node.type === 'image' || node.type === 'imageReference') {
    return '';
  }
  if (node.type === 'html') return '';
  if (!isParent(node)) return '';
  return node.children.map((child) => inlineText(child as Content)).join('');
}

function blockText(node: Content): string {
  if (EXCLUDED_CONTAINER_TYPES.has(node.type)) return '';
  if (node.type === 'code') return node.lang?.toLowerCase() === 'layerone' ? node.value : '';
  if (node.type === 'paragraph') return inlineText(node);
  if (!isParent(node)) return '';
  return node.children.map((child) => blockText(child as Content)).join(' ');
}

function isStandardOpeningDisclaimer(node: Content): boolean {
  if (node.type !== 'blockquote') return false;
  return /^disclaimer\s*:/i.test(normalizeRenderedProse(blockText(node)));
}

function collectParagraphs(
  node: Content,
  output: Array<{ text: string; kind: SpeechParagraphKind }>,
) {
  if (EXCLUDED_CONTAINER_TYPES.has(node.type)) return;

  if (node.type === 'code') {
    if (node.lang?.toLowerCase() === 'layerone') {
      const text = normalizeLayerone(node.value);
      if (text) output.push({ text, kind: 'layerone' });
    }
    return;
  }

  if (node.type === 'paragraph') {
    const text = normalizeRenderedProse(inlineText(node));
    if (text) output.push({ text, kind: 'prose' });
    return;
  }

  if (!isParent(node)) return;
  for (const child of node.children) {
    collectParagraphs(child as Content, output);
  }
}

function parseMarkdown(markdown: string): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkThinkingTags)
    .use(remarkFictionalLangTags);
  return processor.runSync(processor.parse(markdown)) as Root;
}

export function deriveSpeechDocument(markdown: string): SpeechDocument {
  const prepared = preparePostMarkdown(markdown);
  const collected: Array<{ text: string; kind: SpeechParagraphKind }> = [];
  let firstSubstantiveNodeSeen = false;

  for (const part of splitMarkdownSpeciesCareTokens(prepared)) {
    if (part.type !== 'markdown' || !part.content?.trim()) continue;
    const tree = parseMarkdown(part.content);

    for (const child of tree.children) {
      const node = child as Content;
      if (node.type === 'thematicBreak' || node.type === 'definition') continue;

      if (!firstSubstantiveNodeSeen) {
        firstSubstantiveNodeSeen = true;
        if (isStandardOpeningDisclaimer(node)) continue;
      }

      collectParagraphs(node, collected);
    }
  }

  let text = '';
  const paragraphs: SpeechParagraph[] = [];
  for (const paragraph of collected) {
    if (text) text += ' ';
    const start = text.length;
    text += paragraph.text;
    paragraphs.push({ start, end: text.length, kind: paragraph.kind });
  }

  return { text, offset_unit: TTS_OFFSET_UNIT, paragraphs };
}

export function serializeSpeechDocumentForHash(document: SpeechDocument): string {
  const paragraphIdentity = document.paragraphs
    .map((paragraph) => `${paragraph.start}:${paragraph.end}:${paragraph.kind}`)
    .join('\n');
  return `tts-document-v1\n${document.text}\n${paragraphIdentity}`;
}

export async function hashSpeechDocument(document: SpeechDocument): Promise<string> {
  const bytes = new TextEncoder().encode(serializeSpeechDocumentForHash(document));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
