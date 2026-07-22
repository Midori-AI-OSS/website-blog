import type { TtsHighlightRange } from '@/lib/tts/contract';
import type { SpeechDocument } from '@/lib/tts/speechDocument';

const HIGHLIGHT_CLASS = 'tts-highlight';
const LAYERONE_ACTIVE_CLASS = 'tts-layerone-active';
const LAYERONE_ENTERING_CLASS = 'tts-layerone-entering';
const LAYERONE_LINGERING_CLASS = 'tts-layerone-lingering';
const LAYERONE_ENTRY_MS = 600;
const LAYERONE_LINGER_MS = 10_000;

interface DomPoint {
  node: Text;
  offset: number;
}

interface NormalizedDomText {
  layeroneBlock: HTMLElement | null;
  text: string;
  textNodes: Text[];
  starts: DomPoint[];
  ends: DomPoint[];
}

interface ClearOptions {
  normal?: 'immediate' | 'transition';
  layerone?: 'immediate' | 'linger';
}

const elementTimers = new WeakMap<HTMLElement, number>();

function clearElementTimer(element: HTMLElement) {
  const timer = elementTimers.get(element);
  if (timer === undefined) return;
  const view = element.ownerDocument.defaultView;
  if (view) view.clearTimeout(timer);
  else globalThis.clearTimeout(timer);
  elementTimers.delete(element);
}

function setElementTimer(element: HTMLElement, callback: () => void, delay: number) {
  clearElementTimer(element);
  const view = element.ownerDocument.defaultView;
  const callbackWithCleanup = () => {
    elementTimers.delete(element);
    callback();
  };
  const timer = view
    ? view.setTimeout(callbackWithCleanup, delay)
    : (globalThis.setTimeout(callbackWithCleanup, delay) as unknown as number);
  elementTimers.set(element, timer);
}

function prefersReducedMotion(element: Element): boolean {
  return Boolean(
    element.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
}

function normalizeSpeechDomText(
  root: Element,
  excludedDescendants: Set<Element>,
  layeroneBlock: HTMLElement | null = null,
): NormalizedDomText {
  const textNodes: Text[] = [];
  const showText = root.ownerDocument.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = root.ownerDocument.createTreeWalker(root, showText);
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    if (
      parent &&
      !Array.from(excludedDescendants).some(
        (excluded) => excluded === parent || excluded.contains(parent),
      )
    ) {
      textNodes.push(textNode);
    }
    current = walker.nextNode();
  }

  let text = '';
  const starts: DomPoint[] = [];
  const ends: DomPoint[] = [];
  let pendingWhitespaceStart: DomPoint | null = null;
  let pendingWhitespaceEnd: DomPoint | null = null;

  for (const node of textNodes) {
    for (let offset = 0; offset < node.data.length; offset += 1) {
      const character = node.data[offset] ?? '';
      if (/\s/u.test(character)) {
        pendingWhitespaceStart ??= { node, offset };
        pendingWhitespaceEnd = { node, offset: offset + 1 };
        continue;
      }

      if (pendingWhitespaceStart && pendingWhitespaceEnd && text.length > 0) {
        text += ' ';
        starts.push(pendingWhitespaceStart);
        ends.push(pendingWhitespaceEnd);
      }
      pendingWhitespaceStart = null;
      pendingWhitespaceEnd = null;
      text += character;
      starts.push({ node, offset });
      ends.push({ node, offset: offset + 1 });
    }
  }

  return { layeroneBlock, text, textNodes, starts, ends };
}

function getSpeechDomCandidates(root: HTMLElement): NormalizedDomText[] {
  const candidates: NormalizedDomText[] = [];
  for (const element of root.querySelectorAll('p, li, pre')) {
    if (element.closest('h1, h2, h3, h4, h5, h6, table')) continue;

    if (element.tagName === 'PRE') {
      const layerone = element.querySelector('code.language-layerone');
      if (!layerone) continue;
      candidates.push(normalizeSpeechDomText(layerone, new Set(), element as HTMLElement));
      continue;
    }

    if (
      element.tagName === 'LI' &&
      Array.from(element.children).some((child) => child.tagName === 'P')
    ) {
      continue;
    }

    const excluded = new Set<Element>();
    for (const descendant of element.querySelectorAll('code, pre, img, table, ul, ol')) {
      if (
        element.tagName === 'LI' &&
        (descendant.tagName === 'UL' || descendant.tagName === 'OL')
      ) {
        excluded.add(descendant);
      } else if (descendant.tagName === 'CODE' || descendant.tagName === 'PRE') {
        excluded.add(descendant);
      }
    }
    candidates.push(normalizeSpeechDomText(element, excluded));
  }
  return candidates.filter((candidate) => candidate.text.length > 0);
}

function buildParagraphMappings(
  root: HTMLElement,
  speechDocument: SpeechDocument,
): Array<NormalizedDomText | null> {
  const candidates = getSpeechDomCandidates(root);
  const mappings: Array<NormalizedDomText | null> = [];
  let candidateIndex = 0;

  for (const paragraph of speechDocument.paragraphs) {
    const expected = speechDocument.text.slice(paragraph.start, paragraph.end);
    let mapping: NormalizedDomText | null = null;
    while (candidateIndex < candidates.length) {
      const candidate = candidates[candidateIndex] ?? null;
      candidateIndex += 1;
      if (candidate?.text === expected) {
        mapping = candidate;
        break;
      }
    }
    mappings.push(mapping);
  }
  return mappings;
}

function unwrapHighlights(spans: HTMLElement[]) {
  const parents = new Set<Node>();
  for (const span of [...spans].reverse()) {
    if (!span.isConnected) continue;
    clearElementTimer(span);
    const parent = span.parentNode;
    if (!parent) continue;
    parents.add(parent);
    span.replaceWith(...Array.from(span.childNodes));
  }
  for (const parent of parents) parent.normalize();
}

function resetLayeroneBlock(block: HTMLElement) {
  clearElementTimer(block);
  block.classList.remove(LAYERONE_ACTIVE_CLASS, LAYERONE_ENTERING_CLASS, LAYERONE_LINGERING_CLASS);
}

function lingerLayeroneBlock(block: HTMLElement) {
  if (!block.classList.contains(LAYERONE_ACTIVE_CLASS)) return;
  if (prefersReducedMotion(block)) {
    resetLayeroneBlock(block);
    return;
  }
  clearElementTimer(block);
  block.classList.remove(LAYERONE_ACTIVE_CLASS, LAYERONE_ENTERING_CLASS);
  block.classList.add(LAYERONE_LINGERING_CLASS);
  setElementTimer(block, () => resetLayeroneBlock(block), LAYERONE_LINGER_MS);
}

function activateLayeroneBlock(block: HTMLElement) {
  if (block.classList.contains(LAYERONE_ACTIVE_CLASS)) return;
  clearElementTimer(block);
  block.classList.remove(LAYERONE_LINGERING_CLASS);
  block.classList.add(LAYERONE_ACTIVE_CLASS);
  if (prefersReducedMotion(block)) return;
  block.classList.add(LAYERONE_ENTERING_CLASS);
  setElementTimer(block, () => block.classList.remove(LAYERONE_ENTERING_CLASS), LAYERONE_ENTRY_MS);
}

function rangesOverlap(start: number, end: number, range: TtsHighlightRange): boolean {
  return start < range.end && end > range.start;
}

function transitionHighlightsOut(root: HTMLElement) {
  const highlights = Array.from(root.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`)).filter(
    (span) => !span.classList.contains('tts-highlight--exiting'),
  );

  for (const span of highlights) {
    span.classList.remove('tts-highlight--entering', 'tts-highlight--active');
    span.classList.add('tts-highlight--exiting');
    const duration = prefersReducedMotion(span)
      ? 0
      : Math.max(0, Number(span.dataset.ttsHandoffMs) || 0);
    setElementTimer(span, () => unwrapHighlights([span]), duration + 50);
  }
}

function transitionOldHighlights(root: HTMLElement, range: TtsHighlightRange) {
  const active = Array.from(root.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`)).filter(
    (span) => !span.classList.contains('tts-highlight--exiting'),
  );
  const overlapping = active.filter((span) =>
    rangesOverlap(Number(span.dataset.ttsStart), Number(span.dataset.ttsEnd), range),
  );
  unwrapHighlights(overlapping);
  transitionHighlightsOut(root);

  const exitingOverlaps = Array.from(
    root.querySelectorAll<HTMLElement>('.tts-highlight--exiting'),
  ).filter((span) =>
    rangesOverlap(Number(span.dataset.ttsStart), Number(span.dataset.ttsEnd), range),
  );
  unwrapHighlights(exitingOverlaps);
}

function createTextSegments(
  mapping: NormalizedDomText,
  relativeStart: number,
  relativeEnd: number,
): Array<{ node: Text; start: number; end: number }> {
  const start = mapping.starts[relativeStart];
  const end = mapping.ends[relativeEnd - 1];
  if (!start || !end) return [];

  const startIndex = mapping.textNodes.indexOf(start.node);
  const endIndex = mapping.textNodes.indexOf(end.node);
  if (startIndex < 0 || endIndex < startIndex) return [];

  const segments: Array<{ node: Text; start: number; end: number }> = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const node = mapping.textNodes[index];
    if (!node) continue;
    const segmentStart = index === startIndex ? start.offset : 0;
    const segmentEnd = index === endIndex ? end.offset : node.data.length;
    if (segmentEnd > segmentStart) segments.push({ node, start: segmentStart, end: segmentEnd });
  }
  return segments;
}

function wrapSegment(
  segment: { node: Text; start: number; end: number },
  activeRange: TtsHighlightRange,
): HTMLElement | null {
  if (!segment.node.isConnected) return null;
  const document = segment.node.ownerDocument;
  const range = document.createRange();
  range.setStart(segment.node, segment.start);
  range.setEnd(segment.node, segment.end);

  const span = document.createElement('span');
  span.className = `${HIGHLIGHT_CLASS} tts-highlight--${activeRange.precision} tts-highlight--entering`;
  span.dataset.ttsStart = String(activeRange.start);
  span.dataset.ttsEnd = String(activeRange.end);
  span.dataset.ttsHandoffMs = String(activeRange.handoff_ms);
  const handoffMs = prefersReducedMotion(span) ? 0 : activeRange.handoff_ms;
  span.style.setProperty('--tts-handoff-ms', `${handoffMs}ms`);
  range.surroundContents(span);
  setElementTimer(
    span,
    () => {
      if (!span.isConnected) return;
      span.classList.remove('tts-highlight--entering');
      span.classList.add('tts-highlight--active');
    },
    handoffMs,
  );
  return span;
}

export function clearTtsHighlights(root: HTMLElement, options: ClearOptions = {}) {
  delete root.dataset.ttsActiveRange;
  if (options.normal === 'transition') transitionHighlightsOut(root);
  else unwrapHighlights(Array.from(root.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`)));

  for (const block of root.querySelectorAll<HTMLElement>(
    `pre.${LAYERONE_ACTIVE_CLASS}, pre.${LAYERONE_ENTERING_CLASS}, pre.${LAYERONE_LINGERING_CLASS}`,
  )) {
    if (options.layerone === 'linger') lingerLayeroneBlock(block);
    else resetLayeroneBlock(block);
  }
}

export function applyTtsHighlight(
  root: HTMLElement,
  speechDocument: SpeechDocument,
  activeRange: TtsHighlightRange,
) {
  const rangeKey = `${activeRange.start}:${activeRange.end}:${activeRange.precision}`;
  if (root.dataset.ttsActiveRange === rangeKey) return;

  transitionOldHighlights(root, activeRange);
  const mappings = buildParagraphMappings(root, speechDocument);
  const activeLayeroneBlocks = new Set<HTMLElement>();
  const segments: Array<{ node: Text; start: number; end: number }> = [];

  speechDocument.paragraphs.forEach((paragraph, index) => {
    const start = Math.max(activeRange.start, paragraph.start);
    const end = Math.min(activeRange.end, paragraph.end);
    const mapping = mappings[index];
    if (!mapping || end <= start) return;

    if (mapping.layeroneBlock) {
      activeLayeroneBlocks.add(mapping.layeroneBlock);
      return;
    }

    segments.push(...createTextSegments(mapping, start - paragraph.start, end - paragraph.start));
  });

  for (const block of root.querySelectorAll<HTMLElement>(`pre.${LAYERONE_ACTIVE_CLASS}`)) {
    if (!activeLayeroneBlocks.has(block)) lingerLayeroneBlock(block);
  }
  for (const block of activeLayeroneBlocks) activateLayeroneBlock(block);

  for (const segment of segments.reverse()) wrapSegment(segment, activeRange);
  root.dataset.ttsActiveRange = rangeKey;
}
