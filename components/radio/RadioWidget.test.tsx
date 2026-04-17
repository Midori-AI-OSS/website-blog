import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';

import RadioWidget from './RadioWidget';

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;
let currentTrackId = 'track-1';
let lastAudio: MockAudio | null = null;
let intervalEntries = new Map<number, { delay: number; callback: () => void }>();
let timeoutEntries = new Map<number, { delay: number; callback: () => void }>();
let nextTimerId = 1;

const originalGlobals = new Map<string, unknown>();
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;

class MockAudio {
  src = '';
  volume = 0.5;
  paused = true;
  playCalls = 0;
  srcHistory: string[] = [];
  private listeners = new Map<string, Set<(event: Event) => void>>();

  constructor() {
    lastAudio = this;
  }

  load() {
    return;
  }

  async play() {
    this.playCalls += 1;
    this.paused = false;
    this.srcHistory.push(this.src);
    this.emit('playing');
    return;
  }

  pause() {
    if (this.paused) {
      return;
    }

    this.paused = true;
    this.emit('pause');
  }

  removeAttribute(name: string) {
    if (name === 'src') {
      this.src = '';
    }
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
    if (!listeners) {
      return;
    }

    for (const current of listeners) {
      if (current === listener || (typeof listener !== 'function' && current === listener.handleEvent)) {
        listeners.delete(current);
      }
    }
  }

  private emit(type: string) {
    const event = new Event(type);
    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(event);
    }
  }
}

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    originalSetTimeout(() => {
      this.onload?.();
    }, 0);
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
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    Image: MockImage,
    Audio: MockAudio,
    getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
    requestAnimationFrame: (cb: FrameRequestCallback) => originalSetTimeout(() => cb(Date.now()), 0),
    cancelAnimationFrame: (id: number) => originalClearTimeout(id),
    IS_REACT_ACT_ENVIRONMENT: true,
  };

  for (const [key, value] of Object.entries(assignments)) {
    originalGlobals.set(key, (globalThis as Record<string, unknown>)[key]);
    (globalThis as Record<string, unknown>)[key] = value;
  }

  const matchMedia = ((query: string) => ({
    matches:
      query === '(hover: hover)' ||
      query === '(pointer: fine)' ||
      query === '(min-width: 1024px)',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof testWindow.matchMedia;

  testWindow.matchMedia = matchMedia;
  testWindow.scrollTo = () => {};
  (testWindow as Window & { SyntaxError?: typeof SyntaxError }).SyntaxError = SyntaxError;
}

function installTimers() {
  intervalEntries = new Map();
  timeoutEntries = new Map();
  nextTimerId = 1;

  const setIntervalMock = ((handler: TimerHandler, delay?: number) => {
    const id = nextTimerId += 1;
    if (typeof handler === 'function') {
      intervalEntries.set(id, {
        delay: delay ?? 0,
        callback: handler as () => void,
      });
    }
    return id as ReturnType<typeof setInterval>;
  }) as typeof setInterval;

  const clearIntervalMock = ((id: ReturnType<typeof setInterval>) => {
    intervalEntries.delete(Number(id));
  }) as typeof clearInterval;

  const setTimeoutMock = ((handler: TimerHandler, delay?: number) => {
    if ((delay ?? 0) <= 0) {
      return originalSetTimeout(handler, delay);
    }

    const id = nextTimerId += 1;
    if (typeof handler === 'function') {
      timeoutEntries.set(id, {
        delay: delay ?? 0,
        callback: handler as () => void,
      });
    }
    return id as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  const clearTimeoutMock = ((id: ReturnType<typeof setTimeout>) => {
    if (timeoutEntries.delete(Number(id))) {
      return;
    }
    originalClearTimeout(id);
  }) as typeof clearTimeout;

  globalThis.setInterval = setIntervalMock;
  globalThis.clearInterval = clearIntervalMock;
  globalThis.setTimeout = setTimeoutMock;
  globalThis.clearTimeout = clearTimeoutMock;
  testWindow.setInterval = setIntervalMock;
  testWindow.clearInterval = clearIntervalMock;
  testWindow.setTimeout = setTimeoutMock;
  testWindow.clearTimeout = clearTimeoutMock;
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
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setFetchMock() {
  originalGlobals.set('fetch', globalThis.fetch);
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/api/radio-images')) {
      return jsonResponse({
        images: ['/blog/a.png'],
        placeholder: '/blog/placeholder.png',
        count: 1,
        generated_at: '2026-04-17T00:00:00.000Z',
      });
    }

    if (url.endsWith('/api/radio/channels')) {
      return jsonResponse({
        version: 'radio.v1',
        ok: true,
        now: '2026-04-17T00:00:00.000Z',
        data: {
          channels: [{ name: 'all', track_count: 10 }],
        },
        error: null,
      });
    }

    if (url.includes('/api/radio/current')) {
      return jsonResponse({
        version: 'radio.v1',
        ok: true,
        now: '2026-04-17T00:00:00.000Z',
        data: {
          station_label: 'Midori AI Radio',
          channel: 'all',
          track_id: currentTrackId,
          title: currentTrackId === 'track-1' ? 'Track One' : 'Track Two',
          duration_ms: 180000,
          position_ms: 1000,
          started_at: '2026-04-17T00:00:00.000Z',
          warmup_active: false,
          quality_levels: [],
        },
        error: null,
      });
    }

    if (url.includes('/api/radio/art')) {
      return jsonResponse({
        version: 'radio.v1',
        ok: true,
        now: '2026-04-17T00:00:00.000Z',
        data: {
          channel: 'all',
          track_id: currentTrackId,
          has_art: false,
          mime: null,
          art_url: '',
        },
        error: null,
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;
}

async function flushEffects() {
  await Promise.resolve();
  await new Promise((resolve) => originalSetTimeout(resolve, 0));
  await Promise.resolve();
  await new Promise((resolve) => originalSetTimeout(resolve, 0));
}

async function renderWidget() {
  await act(async () => {
    root.render(<RadioWidget />);
    await flushEffects();
  });
}

async function waitForCondition(predicate: () => boolean, failureMessage: string) {
  const deadline = Date.now() + 1500;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await act(async () => {
      await flushEffects();
    });
  }

  throw new Error(`${failureMessage}\n${container.innerHTML}`);
}

function getPrimaryButton() {
  return container.querySelector('button');
}

async function clickPrimaryButton() {
  const button = getPrimaryButton();
  if (!(button instanceof testWindow.HTMLButtonElement)) {
    throw new Error(`Expected primary button.\n${container.innerHTML}`);
  }

  await act(async () => {
    button.dispatchEvent(new testWindow.MouseEvent('click', { bubbles: true }));
    await flushEffects();
  });
}

async function runInterval(delay: number) {
  const match = [...intervalEntries.values()].find((entry) => entry.delay === delay);
  if (!match) {
    throw new Error(`Expected interval with delay ${delay}`);
  }

  await act(async () => {
    match.callback();
    await flushEffects();
  });
}

async function runTimeout(delay: number) {
  const match = [...timeoutEntries.entries()].find(([, entry]) => entry.delay === delay);
  if (!match) {
    throw new Error(`Expected timeout with delay ${delay}`);
  }

  timeoutEntries.delete(match[0]);

  await act(async () => {
    match[1].callback();
    await flushEffects();
  });
}

beforeEach(() => {
  installDom();
  installTimers();
  setFetchMock();
  currentTrackId = 'track-1';
  lastAudio = null;

  testWindow.localStorage.setItem('midoriai.radio.open', 'true');

  container = testWindow.document.createElement('div');
  testWindow.document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
    await flushEffects();
  });

  container.remove();
  restoreDom();
});

describe('RadioWidget', () => {
  test('reconnects with a fresh stream URL when the track changes', async () => {
    await renderWidget();
    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 1,
      'Expected initial playback to start'
    );

    const firstSrc = lastAudio?.src ?? '';
    expect(firstSrc).toContain('/api/radio/stream');
    expect(firstSrc).toContain('channel=all');
    expect(firstSrc).toContain('q=medium');
    expect(firstSrc).toContain('ts=');

    currentTrackId = 'track-2';
    await runInterval(5000);

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 2,
      'Expected playback to reconnect for the new track'
    );

    expect(lastAudio?.src).not.toBe(firstSrc);
    expect(lastAudio?.src).toContain('ts=');
  });

  test('rotates the live session when the max session timer expires', async () => {
    await renderWidget();
    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 1,
      'Expected initial playback to start'
    );

    const firstSrc = lastAudio?.src ?? '';

    await runTimeout(2 * 60 * 60 * 1000);

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 2,
      'Expected playback to reconnect after the session timer'
    );

    expect(lastAudio?.src).not.toBe(firstSrc);
  });
});
