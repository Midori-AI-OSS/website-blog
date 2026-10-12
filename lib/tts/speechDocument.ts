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
export type SpeechLanguage = 'celestial' | 'abyssal';

export interface SpeechLanguageSpan {
  /** UTF-16 code-unit index, matching String#slice and DOM Text offsets. */
  start: number;
  /** UTF-16 code-unit index, matching String#slice and DOM Text offsets. */
  end: number;
  language: SpeechLanguage;
  understood: boolean;
}

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
  language_spans: SpeechLanguageSpan[];
}

interface ActiveLanguage {
  language: SpeechLanguage;
  understood: boolean;
}

interface AnnotatedTextPart {
  text: string;
  language: ActiveLanguage | null;
}

interface NormalizedAnnotatedText {
  text: string;
  languageSpans: Array<{
    start: number;
    end: number;
    language: SpeechLanguage;
    understood: boolean;
  }>;
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
  if (node.type === 'inlineCode') return node.value;
  if (node.type === 'image' || node.type === 'imageReference') {
    return '';
  }
  if (node.type === 'html') return '';
  if (!isParent(node)) return '';
  return node.children.map((child) => inlineText(child as Content)).join('');
}

function appendAnnotatedText(
  node: Content,
  inheritedLanguage: ActiveLanguage | null,
  output: AnnotatedTextPart[],
): void {
  const candidate = node as Content & {
    type: string;
    data?: { hProperties?: Record<string, unknown> };
  };
  const properties = candidate.data?.hProperties;
  const nodeType = (node as { type: string }).type;
  const candidateLanguage = properties?.['data-lang'];
  const language: ActiveLanguage | null =
    nodeType === 'fictionalLang' &&
    (candidateLanguage === 'celestial' || candidateLanguage === 'abyssal')
      ? {
          language: candidateLanguage,
          understood: properties?.['data-reveal'] === 'true',
        }
      : inheritedLanguage;

  let value: string | null = null;
  if (node.type === 'text') value = node.value;
  else if (node.type === 'break') value = ' ';
  else if (node.type === 'inlineCode') value = node.value;
  else if (node.type === 'image' || node.type === 'imageReference' || node.type === 'html') return;

  if (value !== null) {
    if (value) output.push({ text: value, language });
    return;
  }

  if (!isParent(node)) return;
  for (const child of node.children) {
    appendAnnotatedText(child as Content, language, output);
  }
}

function normalizeAnnotatedProse(parts: AnnotatedTextPart[]): NormalizedAnnotatedText {
  let text = '';
  const modes: Array<ActiveLanguage | null> = [];
  let pendingWhitespace = false;
  let pendingWhitespaceLanguage: ActiveLanguage | null = null;

  const append = (value: string, language: ActiveLanguage | null) => {
    text += value;
    for (let index = 0; index < value.length; index += 1) modes.push(language);
  };

  for (const part of parts) {
    for (const character of part.text) {
      if (character === '*') continue;
      if (/\s/u.test(character)) {
        if (!pendingWhitespace) pendingWhitespaceLanguage = part.language;
        pendingWhitespace = true;
        continue;
      }
      if (pendingWhitespace && text.length > 0) append(' ', pendingWhitespaceLanguage);
      pendingWhitespace = false;
      pendingWhitespaceLanguage = null;
      const normalizedCharacter =
        character === '“' || character === '”' ? '"' : character === '—' ? '-' : character;
      append(normalizedCharacter, part.language);
    }
  }

  const leadingWhitespace = text.match(/^\s+/u)?.[0].length ?? 0;
  const trailingWhitespace = text.match(/\s+$/u)?.[0].length ?? 0;
  if (leadingWhitespace || trailingWhitespace) {
    const end = text.length - trailingWhitespace;
    text = text.slice(leadingWhitespace, end);
    modes.splice(end);
    modes.splice(0, leadingWhitespace);
  }

  const languageSpans: NormalizedAnnotatedText['languageSpans'] = [];
  let spanStart = -1;
  let active: ActiveLanguage | null = null;
  const closeSpan = (end: number) => {
    if (spanStart < 0 || !active) return;
    languageSpans.push({ start: spanStart, end, ...active });
    spanStart = -1;
    active = null;
  };

  for (let index = 0; index < modes.length; index += 1) {
    const mode = modes[index] ?? null;
    const sameMode =
      mode && active && mode.language === active.language && mode.understood === active.understood;
    if (sameMode) continue;
    closeSpan(index);
    if (mode) {
      active = mode;
      spanStart = index;
    }
  }
  closeSpan(modes.length);
  return { text, languageSpans };
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
  output: Array<{
    text: string;
    kind: SpeechParagraphKind;
    languageSpans: NormalizedAnnotatedText['languageSpans'];
  }>,
) {
  if (EXCLUDED_CONTAINER_TYPES.has(node.type)) return;

  if (node.type === 'code') {
    if (node.lang?.toLowerCase() === 'layerone') {
      const text = normalizeLayerone(node.value);
      if (text) output.push({ text, kind: 'layerone', languageSpans: [] });
    }
    return;
  }

  if (node.type === 'paragraph') {
    const annotatedParts: AnnotatedTextPart[] = [];
    appendAnnotatedText(node, null, annotatedParts);
    const normalized = normalizeAnnotatedProse(annotatedParts);
    if (normalized.text) {
      output.push({
        text: normalized.text,
        kind: 'prose',
        languageSpans: normalized.languageSpans,
      });
    }
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
  const collected: Array<{
    text: string;
    kind: SpeechParagraphKind;
    languageSpans: NormalizedAnnotatedText['languageSpans'];
  }> = [];
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
  const language_spans: SpeechLanguageSpan[] = [];
  for (const paragraph of collected) {
    if (text) text += ' ';
    const start = text.length;
    text += paragraph.text;
    paragraphs.push({ start, end: text.length, kind: paragraph.kind });
    for (const span of paragraph.languageSpans) {
      language_spans.push({
        start: start + span.start,
        end: start + span.end,
        language: span.language,
        understood: span.understood,
      });
    }
  }

  return { text, offset_unit: TTS_OFFSET_UNIT, paragraphs, language_spans };
}

export function serializeSpeechDocumentForHash(document: SpeechDocument): string {
  const paragraphIdentity = document.paragraphs
    .map((paragraph) => `${paragraph.start}:${paragraph.end}:${paragraph.kind}`)
    .join('\n');
  const languageIdentity = document.language_spans
    .map(
      (span) =>
        `${span.start}:${span.end}:${span.language}:${span.understood ? 'understood' : 'unknown'}`,
    )
    .join('\n');
  return `tts-document-v2\n${document.text}\n${paragraphIdentity}\n${languageIdentity}`;
}

export async function hashSpeechDocument(document: SpeechDocument): Promise<string> {
  const bytes = new TextEncoder().encode(serializeSpeechDocumentForHash(document));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
