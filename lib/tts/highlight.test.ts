import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { applyTtsHighlight, clearTtsHighlights } from './highlight';
import { deriveSpeechDocument } from './speechDocument';

function createRoot(html: string, reducedMotion = false) {
  const window = new Window();
  window.SyntaxError = SyntaxError;
  window.matchMedia = (() => ({ matches: reducedMotion })) as typeof window.matchMedia;
  const root = window.document.createElement('div');
  root.innerHTML = html;
  window.document.body.append(root);
  return { root: root as unknown as HTMLElement, window };
}

function rangeFor(text: string, selected: string, precision: 'statement' | 'chunk' = 'statement') {
  const start = text.indexOf(selected);
  if (start < 0) throw new Error(`Missing selection: ${selected}`);
  return {
    start,
    end: start + selected.length,
    precision,
    handoff_ms: precision === 'statement' ? 250 : 350,
  } as const;
}

describe('TTS DOM highlights', () => {
  test('wraps the selected text and clears without changing content', () => {
    const document = deriveSpeechDocument('Hello world.');
    const { root } = createRoot('<p>Hello world.</p>');
    const original = root.innerHTML;

    applyTtsHighlight(root, document, rangeFor(document.text, 'world'));

    expect(root.querySelector('.tts-highlight')?.textContent).toBe('world');
    expect(root.textContent).toBe('Hello world.');

    clearTtsHighlights(root);
    expect(root.innerHTML).toBe(original);
  });

  test('segments partial styled boundaries instead of restructuring markup', () => {
    const document = deriveSpeechDocument('Hello **bold words** ending.');
    const { root } = createRoot('<p>Hello <strong>bold words</strong> ending.</p>');
    const original = root.innerHTML;

    applyTtsHighlight(root, document, rangeFor(document.text, 'ld words end'));

    expect(root.querySelectorAll('.tts-highlight')).toHaveLength(2);
    expect(root.querySelector('strong')?.textContent).toBe('bold words');
    expect(root.textContent).toBe(document.text);

    clearTtsHighlights(root);
    expect(root.innerHTML).toBe(original);
  });

  test('supports UTF-16 offsets, collapsed whitespace, and repeated reapplication', () => {
    const document = deriveSpeechDocument('Launch 🚀   now.\n\nSecond line.');
    const { root } = createRoot('<p>Launch 🚀   now.</p><p>Second line.</p>');
    const originalText = root.textContent;
    const selected = '🚀 now.';

    applyTtsHighlight(root, document, rangeFor(document.text, selected));
    expect(root.querySelectorAll('.tts-highlight')).toHaveLength(1);
    expect(root.querySelector('.tts-highlight')?.textContent).toBe('🚀   now.');

    clearTtsHighlights(root);
    applyTtsHighlight(root, document, rangeFor(document.text, 'Second', 'chunk'));
    expect(root.querySelectorAll('.tts-highlight')).toHaveLength(1);
    expect(root.querySelector('.tts-highlight--chunk')?.textContent).toBe('Second');
    expect(root.textContent).toBe(originalText);
  });

  test('keeps an outgoing paragraph mounted through a gap before the next block', () => {
    const document = deriveSpeechDocument('First paragraph.\n\nSecond paragraph.');
    const { root } = createRoot('<p>First paragraph.</p><p>Second paragraph.</p>');

    applyTtsHighlight(root, document, rangeFor(document.text, 'First paragraph.'));
    clearTtsHighlights(root, { normal: 'transition', layerone: 'linger' });

    const outgoing = root.querySelector('.tts-highlight--exiting');
    expect(outgoing?.textContent).toBe('First paragraph.');

    applyTtsHighlight(root, document, rangeFor(document.text, 'Second paragraph.'));

    expect(outgoing?.isConnected).toBe(true);
    expect(root.querySelector('.tts-highlight--entering')?.textContent).toBe('Second paragraph.');
    expect(root.textContent).toBe('First paragraph.Second paragraph.');
  });

  test('keeps inline code excluded while highlighting spoken text around it', () => {
    const document = deriveSpeechDocument('Before `hidden()` after.');
    const { root } = createRoot('<p>Before <code>hidden()</code> after.</p>');

    applyTtsHighlight(root, document, {
      start: 0,
      end: document.text.length,
      precision: 'chunk',
      handoff_ms: 350,
    });

    expect(root.querySelector('code .tts-highlight')).toBeNull();
    expect(root.querySelector('code')?.textContent).toBe('hidden()');
    expect(root.querySelectorAll('.tts-highlight')).toHaveLength(2);
  });

  test('activates whole Layer One blocks and preserves literal code text', () => {
    const markdown = 'Before.\n\n```layerone\n*signal* — now\n```\n\nAfter.';
    const document = deriveSpeechDocument(markdown);
    const { root } = createRoot(
      '<p>Before.</p><pre><code class="language-layerone">*signal* — now\n</code></pre><p>After.</p>',
    );
    const layerone = document.paragraphs.find((paragraph) => paragraph.kind === 'layerone');
    if (!layerone) throw new Error('Expected Layer One paragraph');

    applyTtsHighlight(root, document, {
      start: layerone.start,
      end: layerone.end,
      precision: 'statement',
      handoff_ms: 250,
    });

    const block = root.querySelector('pre');
    expect(block?.classList.contains('tts-layerone-active')).toBe(true);
    expect(block?.classList.contains('tts-layerone-entering')).toBe(true);
    expect(block?.textContent).toBe('*signal* — now\n');
    expect(block?.querySelector('.tts-highlight')).toBeNull();

    clearTtsHighlights(root);
    expect(block?.className).toBe('');
    expect(block?.textContent).toBe('*signal* — now\n');
  });

  test('lets multiple Layer One blocks linger and cancels a linger on reactivation', () => {
    const markdown = '```layerone\none\n```\n\nMiddle.\n\n```layerone\ntwo\n```';
    const document = deriveSpeechDocument(markdown);
    const { root } = createRoot(
      '<pre><code class="language-layerone">one\n</code></pre><p>Middle.</p><pre><code class="language-layerone">two\n</code></pre>',
    );
    const [first, , second] = document.paragraphs;
    if (!first || !second) throw new Error('Expected Layer One paragraphs');

    applyTtsHighlight(root, document, {
      start: first.start,
      end: first.end,
      precision: 'statement',
      handoff_ms: 250,
    });
    applyTtsHighlight(root, document, {
      start: second.start,
      end: second.end,
      precision: 'statement',
      handoff_ms: 250,
    });

    const blocks = root.querySelectorAll('pre');
    expect(blocks[0]?.classList.contains('tts-layerone-lingering')).toBe(true);
    expect(blocks[1]?.classList.contains('tts-layerone-active')).toBe(true);

    applyTtsHighlight(root, document, {
      start: first.start,
      end: first.end,
      precision: 'statement',
      handoff_ms: 250,
    });
    expect(blocks[0]?.classList.contains('tts-layerone-active')).toBe(true);
    expect(blocks[0]?.classList.contains('tts-layerone-lingering')).toBe(false);
    expect(blocks[1]?.classList.contains('tts-layerone-lingering')).toBe(true);
  });

  test('uses immediate static Layer One state when reduced motion is requested', () => {
    const markdown = '```layerone\nsignal\n```';
    const document = deriveSpeechDocument(markdown);
    const { root } = createRoot('<pre><code class="language-layerone">signal\n</code></pre>', true);
    const layerone = document.paragraphs[0];
    if (!layerone) throw new Error('Expected Layer One paragraph');

    applyTtsHighlight(root, document, {
      start: layerone.start,
      end: layerone.end,
      precision: 'statement',
      handoff_ms: 250,
    });

    const block = root.querySelector('pre');
    expect(block?.classList.contains('tts-layerone-active')).toBe(true);
    expect(block?.classList.contains('tts-layerone-entering')).toBe(false);

    clearTtsHighlights(root, { layerone: 'linger' });
    expect(block?.className).toBe('');
  });
});
