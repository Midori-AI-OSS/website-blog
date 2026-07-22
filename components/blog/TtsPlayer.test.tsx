import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TTS_CACHE_VERSION, TTS_OFFSET_UNIT, type TtsManifest } from '@/lib/tts/contract';
import { deriveSpeechDocument, hashSpeechDocument } from '@/lib/tts/speechDocument';

import { TtsPlayer } from './TtsPlayer';

type TtsState = 'not_generated' | 'generating' | 'ready';

interface StatusPayload {
  status: TtsState;
  generated_chunks?: number;
  total_chunks?: number;
  playable?: boolean;
  cache_version?: string;
  content_hash?: string;
  manifest?: TtsManifest;
}

const TEST_DOCUMENT = deriveSpeechDocument('Hello world');
const TEST_CONTENT_HASH = await hashSpeechDocument(TEST_DOCUMENT);

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;
let lastAudio: MockAudio | null = null;
let intervalCallback: (() => void) | null = null;
let clearIntervalCalls = 0;
let blobCounter = 0;

const originalGlobals = new Map<string, unknown>();
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

class MockAudio {
  src = '';
  duration = 75;
  currentTime = 0;
  paused = true;
  playCalls = 0;
  private listeners = new Map<string, Set<(event: Event) => void>>();

  constructor() {
    lastAudio = this;
  }

  load() {
    this.emit('loadedmetadata');
  }

  async play() {
    this.playCalls += 1;
    this.paused = false;
    this.emit('playing');
    return;
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.emit('pause');
  }

  dispatch(type: string) {
    this.emit(type);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const listeners = this.listeners.get(type) ?? new Set<(event: Event) => void>();
    const normalized =
      typeof listener === 'function' ? listener : (event: Event) => listener.handleEvent(event);
    listeners.add(normalized);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const listeners = this.listeners.get(type);
    if (!listeners) return;

    for (const current of listeners) {
      if (
        current === listener ||
        (typeof listener !== 'function' && current === listener.handleEvent)
      ) {
        listeners.delete(current);
      }
    }
  }

  private emit(type: string) {
    const event = new Event(type);
    const listeners = this.listeners.get(type);
    if (!listeners) return;

    for (const listener of listeners) {
      listener(event);
    }
  }
}

function installDom() {
  testWindow = new Window({ url: 'http://localhost:3000' });

  const assignments: Record<string, unknown> = {
    window: testWindow,
    document: testWindow.document,
    navigator: testWindow.navigator,
    Node: testWindow.Node,
    Text: testWindow.Text,
    HTMLElement: testWindow.HTMLElement,
    HTMLDivElement: testWindow.HTMLDivElement,
    Event: testWindow.Event,
    MouseEvent: testWindow.MouseEvent,
    KeyboardEvent: testWindow.KeyboardEvent,
    MutationObserver: testWindow.MutationObserver,
    SyntaxError,
    getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    Audio: MockAudio,
    IS_REACT_ACT_ENVIRONMENT: true,
  };

  for (const [key, value] of Object.entries(assignments)) {
    originalGlobals.set(key, (globalThis as Record<string, unknown>)[key]);
    (globalThis as Record<string, unknown>)[key] = value;
  }

  testWindow.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof testWindow.matchMedia;
  testWindow.scrollTo = () => {};

  URL.createObjectURL = (() => {
    blobCounter += 1;
    return `blob:mock-${blobCounter}`;
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
}

function restoreDom() {
  for (const [key, value] of originalGlobals.entries()) {
    if (value === undefined) {
      delete (globalThis as Record<string, unknown>)[key];
      continue;
    }
    (globalThis as Record<string, unknown>)[key] = value;
  }
  originalGlobals.clear();
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function wavResponse() {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  return new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': 'audio/wav' },
  });
}

function setFetchMock(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  originalGlobals.set('fetch', globalThis.fetch);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)) as typeof fetch;
}

async function flushEffects() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function renderPlayer(
  onHighlightChange?: React.ComponentProps<typeof TtsPlayer>['onHighlightChange'],
) {
  await act(async () => {
    root.render(
      <TtsPlayer
        slug="shared-post"
        type="blog"
        document={TEST_DOCUMENT}
        onHighlightChange={onHighlightChange}
      />,
    );
    await flushEffects();
  });
}

async function waitForElement<T>(getter: () => T | null, failureMessage: string): Promise<T> {
  const deadline = Date.now() + 1200;

  while (Date.now() < deadline) {
    const element = getter();
    if (element) return element;

    await act(async () => {
      await flushEffects();
    });
  }

  throw new Error(`${failureMessage}\n${container.innerHTML}`);
}

async function waitForCondition(predicate: () => boolean, failureMessage: string): Promise<void> {
  const deadline = Date.now() + 1200;

  while (Date.now() < deadline) {
    if (predicate()) return;

    await act(async () => {
      await flushEffects();
    });
  }

  throw new Error(`${failureMessage}\n${container.innerHTML}`);
}

function getVisibleGeneratingBar() {
  return (
    getAllElements(container).find(
      (element) =>
        element.getAttribute('role') === 'progressbar' &&
        element.getAttribute('aria-hidden') === 'false',
    ) ?? null
  );
}

function getVisibleListenButton() {
  return (
    getAllElements(container).find(
      (element) =>
        element.getAttribute('role') === 'button' &&
        element.getAttribute('aria-label') === 'Generate audio for this post' &&
        element.getAttribute('aria-hidden') === 'false',
    ) ?? null
  );
}

function getVisibleReadyButton(label: 'Play' | 'Pause') {
  const activeContainer = getAllElements(container).find(
    (element) => element.getAttribute('aria-hidden') === 'false',
  );
  if (!activeContainer) return null;

  return (
    getAllElements(activeContainer).find(
      (element) =>
        element.tagName.toLowerCase() === 'button' && element.getAttribute('aria-label') === label,
    ) ?? null
  );
}

function getAllElements(rootElement: Element) {
  const elements: Element[] = [];
  const stack: Element[] = [rootElement];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    const children = Array.from(current.children);

    for (const child of children) {
      elements.push(child);
      stack.push(child);
    }
  }

  return elements;
}

function payload(status: TtsState, partial?: Omit<StatusPayload, 'status'>): StatusPayload {
  return {
    status,
    generated_chunks: 0,
    total_chunks: 0,
    playable: false,
    cache_version: TTS_CACHE_VERSION,
    content_hash: TEST_CONTENT_HASH,
    ...partial,
  };
}

function manifest(options: { timed: boolean }): TtsManifest {
  return {
    cache_version: TTS_CACHE_VERSION,
    content_hash: TEST_CONTENT_HASH,
    offset_unit: TTS_OFFSET_UNIT,
    text_length: TEST_DOCUMENT.text.length,
    paragraph_gap_ms: 500,
    duration_ms: 1000,
    chunks: [
      {
        index: 0,
        start: 0,
        end: TEST_DOCUMENT.text.length,
        generated: true,
        start_ms: 0,
        end_ms: 1000,
      },
    ],
    statements: options.timed
      ? [
          {
            start: 0,
            end: 5,
            paragraph: 0,
            chunk: 0,
            start_ms: 0,
            end_ms: 1000,
          },
        ]
      : [],
  };
}

beforeEach(() => {
  installDom();
  lastAudio = null;
  intervalCallback = null;
  clearIntervalCalls = 0;
  blobCounter = 0;

  container = testWindow.document.createElement('div');
  testWindow.document.body.appendChild(container);
  root = createRoot(container);

  globalThis.setInterval = ((handler: TimerHandler) => {
    intervalCallback = typeof handler === 'function' ? (handler as () => void) : null;
    return 1 as unknown as ReturnType<typeof setInterval>;
  }) as typeof setInterval;

  globalThis.clearInterval = (() => {
    clearIntervalCalls += 1;
    intervalCallback = null;
  }) as typeof clearInterval;
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
    await flushEffects();
  });
  container.remove();
  restoreDom();
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe('TtsPlayer', () => {
  test('shows the generating bar immediately when another visitor already started generation', async () => {
    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse(payload('generating', { generated_chunks: 1, total_chunks: 8 }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    expect(getVisibleGeneratingBar()).not.toBeNull();
  });

  test('transitions from generating to ready when polling sees completed audio', async () => {
    const statuses: StatusPayload[] = [
      payload('generating', { generated_chunks: 2, total_chunks: 8 }),
      payload('ready', { generated_chunks: 8, total_chunks: 8, playable: true }),
    ];

    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse(statuses.shift() ?? payload('ready'));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    expect(
      await waitForElement(getVisibleGeneratingBar, 'Expected visible generating bar'),
    ).not.toBeNull();

    intervalCallback?.();

    expect(
      await waitForElement(() => getVisibleReadyButton('Play'), 'Expected visible Play button'),
    ).not.toBeNull();
    expect(lastAudio?.src).toContain('/api/tts/audio/blog/shared-post?');
    expect(lastAudio?.src).toContain(`content_hash=${TEST_CONTENT_HASH}`);
    expect(lastAudio?.src).toContain(`cache_version=${TTS_CACHE_VERSION}`);
    expect(lastAudio?.playCalls).toBe(0);
    expect(clearIntervalCalls).toBeGreaterThan(0);
  });

  test('starts streaming playback after listen when generation is playable', async () => {
    setFetchMock(async (url, init) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse(payload('not_generated'));
      }

      if (url.includes('/api/tts/generate?')) {
        expect(url).toContain(`content_hash=${TEST_CONTENT_HASH}`);
        expect(url).toContain(`cache_version=${TTS_CACHE_VERSION}`);
        const requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(requestBody.content_hash).toBe(TEST_CONTENT_HASH);
        expect(requestBody.cache_version).toBe(TTS_CACHE_VERSION);
        expect(requestBody.document).toEqual(TEST_DOCUMENT);
        return jsonResponse(
          payload('generating', {
            generated_chunks: 3,
            total_chunks: 12,
            playable: true,
          }),
          202,
        );
      }

      if (url.includes('/api/tts/chunk/blog/shared-post/0')) {
        return wavResponse();
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    const listenButton = getVisibleListenButton();
    if (!(listenButton instanceof testWindow.HTMLElement)) {
      throw new Error('Expected visible listen button');
    }

    await act(async () => {
      listenButton.dispatchEvent(new testWindow.MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    expect(
      await waitForElement(() => getVisibleReadyButton('Pause'), 'Expected Pause button'),
    ).not.toBeNull();
    expect(lastAudio?.src.startsWith('blob:mock-')).toBe(true);
    expect(lastAudio?.playCalls).toBeGreaterThan(0);
    expect(container.textContent ?? '').toContain('Generating...');
  });

  test('shows ready controls and streams when another viewer opens a playable in-progress generation', async () => {
    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse(
          payload('generating', {
            generated_chunks: 12,
            total_chunks: 420,
            playable: true,
          }),
        );
      }

      if (url.includes('/api/tts/chunk/blog/shared-post/0')) {
        return wavResponse();
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    expect(
      await waitForElement(() => getVisibleReadyButton('Play'), 'Expected Play button'),
    ).not.toBeNull();
    expect(getVisibleGeneratingBar()).toBeNull();

    const playButton = getVisibleReadyButton('Play');
    if (!(playButton instanceof testWindow.HTMLElement)) {
      throw new Error('Expected visible play button');
    }

    await act(async () => {
      playButton.dispatchEvent(new testWindow.MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    expect(
      await waitForElement(() => getVisibleReadyButton('Pause'), 'Expected Pause button'),
    ).not.toBeNull();
    expect(lastAudio?.src.startsWith('blob:mock-')).toBe(true);
    expect(lastAudio?.playCalls).toBeGreaterThan(0);
  });

  test('keeps showing generating bar while local generate request is in flight and not yet playable', async () => {
    const statuses: StatusPayload[] = [payload('not_generated'), payload('not_generated')];
    let resolveGenerate: ((value: Response) => void) | null = null;

    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse(statuses.shift() ?? payload('not_generated'));
      }

      if (url.includes('/api/tts/generate?')) {
        return new Promise<Response>((resolve) => {
          resolveGenerate = resolve;
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    const listenButton = getVisibleListenButton();
    if (!(listenButton instanceof testWindow.HTMLElement)) {
      throw new Error('Expected visible listen button');
    }

    await act(async () => {
      listenButton.dispatchEvent(new testWindow.MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    expect(await waitForElement(getVisibleGeneratingBar, 'Expected generating bar')).not.toBeNull();

    intervalCallback?.();

    expect(
      await waitForElement(getVisibleGeneratingBar, 'Expected generating bar to remain visible'),
    ).not.toBeNull();
    expect(getVisibleReadyButton('Play')).toBeNull();

    await act(async () => {
      resolveGenerate?.(
        jsonResponse(
          payload('generating', {
            generated_chunks: 1,
            total_chunks: 10,
            playable: false,
          }),
          202,
        ),
      );
      await flushEffects();
    });
  });

  test('does not autoplay when audio is already ready for another viewer', async () => {
    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse(
          payload('ready', { generated_chunks: 6, total_chunks: 6, playable: true }),
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    expect(
      await waitForElement(() => getVisibleReadyButton('Play'), 'Expected Play button'),
    ).not.toBeNull();
    expect(getVisibleReadyButton('Pause')).toBeNull();
    expect(lastAudio?.playCalls).toBe(0);
  });

  test('reports exact statement offsets from a completed timing manifest', async () => {
    const highlights: Array<{ start: number; end: number; precision: string } | null> = [];
    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse(
          payload('ready', {
            generated_chunks: 1,
            total_chunks: 1,
            playable: true,
            manifest: manifest({ timed: true }),
          }),
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer((range) => highlights.push(range));
    const playButton = await waitForElement(
      () => getVisibleReadyButton('Play'),
      'Expected ready Play button',
    );

    await act(async () => {
      playButton.dispatchEvent(new testWindow.MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    expect(highlights.at(-1)).toEqual({ start: 0, end: 5, precision: 'statement' });
  });

  test('reports the chunk range while progressive timing is not available yet', async () => {
    const highlights: Array<{ start: number; end: number; precision: string } | null> = [];
    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) return jsonResponse(payload('not_generated'));
      if (url.includes('/api/tts/generate?')) {
        return jsonResponse(
          payload('generating', {
            generated_chunks: 3,
            total_chunks: 3,
            playable: true,
            manifest: manifest({ timed: false }),
          }),
          202,
        );
      }
      if (url.includes('/api/tts/chunk/blog/shared-post/0')) return wavResponse();
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer((range) => highlights.push(range));
    const listenButton = getVisibleListenButton();
    if (!listenButton) throw new Error('Expected visible listen button');

    await act(async () => {
      listenButton.dispatchEvent(new testWindow.MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    await waitForCondition(
      () => highlights.some((range) => range?.precision === 'chunk'),
      'Expected chunk fallback highlight',
    );
    expect(highlights.at(-1)).toEqual({
      start: 0,
      end: TEST_DOCUMENT.text.length,
      precision: 'chunk',
    });
  });

  test('renders safe time labels when audio metadata is non-finite', async () => {
    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse(
          payload('ready', { generated_chunks: 6, total_chunks: 6, playable: true }),
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    expect(
      await waitForElement(() => getVisibleReadyButton('Play'), 'Expected ready controls'),
    ).not.toBeNull();

    if (!lastAudio) {
      throw new Error('Expected audio instance');
    }

    await act(async () => {
      lastAudio.duration = Number.POSITIVE_INFINITY;
      lastAudio.currentTime = Number.NaN;
      lastAudio.dispatch('durationchange');
      lastAudio.dispatch('timeupdate');
      await flushEffects();
    });

    await waitForCondition(
      () => (container.textContent ?? '').includes('0:00 / 0:00'),
      'Expected safe fallback timeline text',
    );
    expect(container.textContent ?? '').not.toContain('Infinity');
    expect(container.textContent ?? '').not.toContain('NaN');
  });
});
