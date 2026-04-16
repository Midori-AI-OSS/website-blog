import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';

import { TtsPlayer } from './TtsPlayer';

type TtsState = 'not_generated' | 'generating' | 'ready';

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;
let lastAudio: MockAudio | null = null;
let intervalCallback: (() => void) | null = null;
let clearIntervalCalls = 0;

const originalGlobals = new Map<string, unknown>();
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;

class MockAudio {
  src = '';
  duration = 75;
  currentTime = 0;
  private listeners = new Map<string, Set<(event: Event) => void>>();

  constructor() {
    lastAudio = this;
  }

  load() {
    this.emit('loadedmetadata');
  }

  async play() {
    this.emit('playing');
    return;
  }

  pause() {
    this.emit('pause');
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const listeners = this.listeners.get(type) ?? new Set<(event: Event) => void>();
    const normalized =
      typeof listener === 'function'
        ? listener
        : (event: Event) => listener.handleEvent(event);
    listeners.add(normalized);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const listeners = this.listeners.get(type);
    if (!listeners) return;

    for (const current of listeners) {
      if (current === listener || (typeof listener !== 'function' && current === listener.handleEvent)) {
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
    requestAnimationFrame: (cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 0),
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

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
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

async function renderPlayer() {
  await act(async () => {
    root.render(<TtsPlayer slug="shared-post" type="blog" text="Hello world" />);
    await flushEffects();
  });
}

async function waitForElement<T>(
  getter: () => T | null,
  failureMessage: string
): Promise<T> {
  const deadline = Date.now() + 1000;

  while (Date.now() < deadline) {
    const element = getter();
    if (element) return element;

    await act(async () => {
      await flushEffects();
    });
  }

  throw new Error(`${failureMessage}\n${container.innerHTML}`);
}

function getVisibleGeneratingBar() {
  return getAllElements(container).find(
    (element) =>
      element.getAttribute('role') === 'progressbar' &&
      element.getAttribute('aria-hidden') === 'false'
  ) ?? null;
}

function getVisibleListenButton() {
  return getAllElements(container).find(
    (element) =>
      element.getAttribute('role') === 'button' &&
      element.getAttribute('aria-label') === 'Generate audio for this post' &&
      element.getAttribute('aria-hidden') === 'false'
  ) ?? null;
}

function getVisibleReadyButton(label: 'Play' | 'Pause') {
  const activeContainer = getAllElements(container).find(
    (element) => element.getAttribute('aria-hidden') === 'false'
  );
  if (!activeContainer) return null;

  return getAllElements(activeContainer).find(
    (element) =>
      element.tagName.toLowerCase() === 'button' &&
      element.getAttribute('aria-label') === label
  ) ?? null;
}

function getAllElements(rootElement: Element) {
  const elements: Element[] = [];
  const stack: Element[] = [rootElement];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = Array.from(current.children);

    for (const child of children) {
      elements.push(child);
      stack.push(child);
    }
  }

  return elements;
}

beforeEach(() => {
  installDom();
  lastAudio = null;
  intervalCallback = null;
  clearIntervalCalls = 0;

  container = testWindow.document.createElement('div');
  testWindow.document.body.appendChild(container);
  root = createRoot(container);

  globalThis.setInterval = ((handler: TimerHandler) => {
    intervalCallback =
      typeof handler === 'function' ? (handler as () => void) : null;
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
});

describe('TtsPlayer', () => {
  test('shows the generating bar immediately when another visitor already started generation', async () => {
    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse({ status: 'generating' satisfies TtsState });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    expect(getVisibleGeneratingBar()).not.toBeNull();
  });

  test('transitions from generating to ready when polling sees completed audio', async () => {
    const statuses: TtsState[] = ['generating', 'ready'];

    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse({
          status: statuses.shift() ?? 'ready',
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    await renderPlayer();

    expect(await waitForElement(getVisibleGeneratingBar, 'Expected visible generating bar')).not.toBeNull();

    intervalCallback?.();

    expect(await waitForElement(() => getVisibleReadyButton('Play'), 'Expected visible Play button')).not.toBeNull();
    expect(lastAudio?.src.endsWith('/api/tts/audio/blog/shared-post')).toBe(true);
    expect(clearIntervalCalls).toBeGreaterThan(0);
  });

  test('keeps showing the generating bar while a local generation request is still in flight', async () => {
    const statuses: TtsState[] = ['not_generated', 'not_generated'];
    let resolveGenerate: ((value: Response) => void) | null = null;

    setFetchMock(async (url) => {
      if (url.includes('/api/tts/status')) {
        return jsonResponse({
          status: statuses.shift() ?? 'not_generated',
        });
      }

      if (url.endsWith('/api/tts/generate')) {
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
      listenButton.dispatchEvent(
        new testWindow.MouseEvent('click', { bubbles: true })
      );
      await flushEffects();
    });

    expect(await waitForElement(getVisibleGeneratingBar, 'Expected generating bar after clicking Listen')).not.toBeNull();

    intervalCallback?.();

    expect(await waitForElement(getVisibleGeneratingBar, 'Expected generating bar to stay visible while request is in flight')).not.toBeNull();
    expect(getVisibleListenButton()).toBeNull();

    resolveGenerate?.(new Response('', { status: 200 }));

    expect(await waitForElement(() => getVisibleReadyButton('Pause'), 'Expected visible Pause button after generation finishes')).not.toBeNull();
    expect(lastAudio?.src.endsWith('/api/tts/audio/blog/shared-post')).toBe(true);
  });
});
