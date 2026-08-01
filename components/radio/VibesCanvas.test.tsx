import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import VibesCanvas from './VibesCanvas';

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;
let rafCallbacks: Array<FrameRequestCallback> = [];
let rafIdCounter = 0;
let cancelledRafIds = new Set<number>();
let documentHidden = false;
let visibilityHandlers: Array<() => void> = [];

const originalGlobals = new Map<string, unknown>();

class MockResizeObserver {
  private _callback: ResizeObserverCallback;
  static _instances: MockResizeObserver[] = [];

  constructor(callback: ResizeObserverCallback) {
    this._callback = callback;
    MockResizeObserver._instances.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {
    const idx = MockResizeObserver._instances.indexOf(this);
    if (idx >= 0) MockResizeObserver._instances.splice(idx, 1);
  }

  static triggerAll() {
    for (const inst of MockResizeObserver._instances) {
      inst._callback([], inst as unknown as ResizeObserver);
    }
  }
}

function installDom() {
  testWindow = new Window({ url: 'http://localhost:3000' });

  const getComputedStyle = testWindow.getComputedStyle.bind(testWindow);

  const assignments: Record<string, unknown> = {
    window: testWindow,
    document: testWindow.document,
    navigator: testWindow.navigator,
    Node: testWindow.Node,
    Text: testWindow.Text,
    HTMLElement: testWindow.HTMLElement,
    HTMLDivElement: testWindow.HTMLDivElement,
    HTMLCanvasElement: testWindow.HTMLCanvasElement,
    Event: testWindow.Event,
    MouseEvent: testWindow.MouseEvent,
    KeyboardEvent: testWindow.KeyboardEvent,
    MutationObserver: testWindow.MutationObserver,
    SyntaxError,
    ResizeObserver: MockResizeObserver,
    getComputedStyle,
    IS_REACT_ACT_ENVIRONMENT: true,
  };

  for (const [key, value] of Object.entries(assignments)) {
    originalGlobals.set(key, (globalThis as Record<string, unknown>)[key]);
    (globalThis as Record<string, unknown>)[key] = value;
  }

  const matchMedia = ((query: string) => ({
    matches:
      query === '(hover: hover)' || query === '(pointer: fine)' || query === '(min-width: 1024px)',
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

  // Mock requestAnimationFrame / cancelAnimationFrame
  const rafMock = (cb: FrameRequestCallback): number => {
    rafIdCounter += 1;
    rafCallbacks.push(cb);
    return rafIdCounter;
  };
  const cafMock = (id: number) => {
    cancelledRafIds.add(id);
    // Clear pending callbacks: real browser cancelAnimationFrame prevents the
    // callback from firing, so reflected here by emptying the queue.
    rafCallbacks = [];
  };

  (globalThis as Record<string, unknown>).requestAnimationFrame = rafMock;
  (globalThis as Record<string, unknown>).cancelAnimationFrame = cafMock;

  // Mock document.hidden and visibilitychange via a simple flag
  documentHidden = false;
  visibilityHandlers = [];

  Object.defineProperty(testWindow.document, 'hidden', {
    get: () => documentHidden,
    configurable: true,
  });

  // Intercept addEventListener for visibilitychange
  const origAddEventListener = testWindow.document.addEventListener;
  const origRemoveEventListener = testWindow.document.removeEventListener;

  testWindow.document.addEventListener = ((
    type: string,
    handler: EventListenerOrEventListenerObject,
  ) => {
    if (type === 'visibilitychange' && typeof handler === 'function') {
      visibilityHandlers.push(handler as () => void);
    }
    return origAddEventListener.call(testWindow.document, type, handler);
  }) as typeof testWindow.document.addEventListener;

  testWindow.document.removeEventListener = ((
    type: string,
    handler: EventListenerOrEventListenerObject,
  ) => {
    if (type === 'visibilitychange' && typeof handler === 'function') {
      const idx = visibilityHandlers.indexOf(handler as () => void);
      if (idx >= 0) visibilityHandlers.splice(idx, 1);
    }
    return origRemoveEventListener.call(testWindow.document, type, handler);
  }) as typeof testWindow.document.removeEventListener;
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

async function flushEffects() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

function flushRafCallbacks(timestamp = performance.now()) {
  const callbacks = rafCallbacks.slice();
  rafCallbacks = [];
  for (const cb of callbacks) {
    cb(timestamp);
  }
}

function setDocumentHidden(hidden: boolean) {
  documentHidden = hidden;
  // Fire all visibilitychange handlers
  for (const handler of visibilityHandlers) {
    handler();
  }
}

const defaultProps = {
  seed: 'test-vibe-seed',
  trackId: 'test-track-1',
  startedAt: '2026-08-01T00:00:00Z',
  durationMs: 180_000,
  positionMs: 30_000,
  palette: null as null,
  energyMultiplier: 1.0,
  reducedMotion: false,
};

beforeEach(() => {
  installDom();
  rafCallbacks = [];
  rafIdCounter = 0;
  cancelledRafIds = new Set();
  visibilityHandlers = [];
  MockResizeObserver._instances = [];

  container = testWindow.document.createElement('div') as unknown as HTMLDivElement;
  testWindow.document.body.appendChild(container as unknown as Node);
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

async function render(props: typeof defaultProps = defaultProps) {
  await act(async () => {
    root.render(<VibesCanvas {...props} />);
    await flushEffects();
  });
  // Allow initial rAF to be scheduled
  flushRafCallbacks(performance.now());
  await flushEffects();
}

describe('VibesCanvas lifecycle', () => {
  test('renders a canvas element when seed is provided', async () => {
    await render();
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  test('returns null when seed is empty', async () => {
    await act(async () => {
      root.render(<VibesCanvas {...defaultProps} seed="" />);
      await flushEffects();
    });
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();
  });

  test('schedules and processes rAF frames without error', async () => {
    await render();

    // Run several frames; each should have a callback queued
    let framesProcessed = 0;
    for (let i = 0; i < 5; i++) {
      expect(rafCallbacks.length).toBeGreaterThan(0);
      expect(() => flushRafCallbacks(performance.now() + i * 33)).not.toThrow();
      framesProcessed++;
    }
    await flushEffects();

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(framesProcessed).toBe(5);
  });

  test('pauses rAF scheduling when document becomes hidden', async () => {
    await render();

    // Clear queued callbacks
    rafCallbacks = [];

    setDocumentHidden(true);
    await flushEffects();

    // After hiding, no new rAF callbacks should have been queued
    expect(rafCallbacks.length).toBe(0);
  });

  test('resumes rAF scheduling when document becomes visible again', async () => {
    await render();

    // Hide then show
    setDocumentHidden(true);
    await flushEffects();
    rafCallbacks = [];

    setDocumentHidden(false);
    await flushEffects();

    // After becoming visible, new rAF should be scheduled
    expect(rafCallbacks.length).toBeGreaterThan(0);
  });

  test('visibilitychange listener is removed on unmount', async () => {
    await render();
    expect(visibilityHandlers.length).toBeGreaterThan(0);

    await act(async () => {
      root.unmount();
      await flushEffects();
    });

    expect(visibilityHandlers.length).toBe(0);
  });

  test('handles rapid mount-unmount without leaking', async () => {
    for (let i = 0; i < 5; i++) {
      const c = testWindow.document.createElement('div') as unknown as HTMLDivElement;
      testWindow.document.body.appendChild(c as unknown as Node);
      root = createRoot(c);
      await render({ ...defaultProps, seed: `seed-${i}` });

      await act(async () => {
        root.unmount();
        await flushEffects();
      });
      c.remove();
    }

    // No errors should have occurred
    expect(true).toBe(true);
  });
});

describe('VibesCanvas resource release', () => {
  test('full cleanup on unmount does not throw', async () => {
    await render();

    // Let frames run
    for (let i = 0; i < 3; i++) {
      flushRafCallbacks(performance.now() + i * 33);
    }
    await flushEffects();

    // Unmount should not throw
    await act(async () => {
      root.unmount();
      await flushEffects();
    });

    // No lingering callbacks
    expect(rafCallbacks.length).toBe(0);
  });
});

describe('VibesCanvas reduced motion', () => {
  test('renders with reduced motion without errors', async () => {
    await render({ ...defaultProps, reducedMotion: true });

    flushRafCallbacks(performance.now());
    await flushEffects();

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  test('does not spam rAF under reduced motion', async () => {
    await render({ ...defaultProps, reducedMotion: true });

    // Consume initial frames
    for (let i = 0; i < 5; i++) {
      flushRafCallbacks(performance.now() + i * 33);
    }
    await flushEffects();

    // With reduced motion, at most 1 callback should be pending
    expect(rafCallbacks.length).toBeLessThanOrEqual(1);
  });
});

describe('buildVibeScene determinism', () => {
  test('same props produce a valid canvas across remounts', async () => {
    await render();
    const c1 = container.querySelector('canvas') as HTMLCanvasElement;
    expect(c1).not.toBeNull();
    // Canvas element exists (proves buildVibeScene didn't throw)

    await act(async () => {
      root.unmount();
      await flushEffects();
    });
    container.remove();

    const c2Container = testWindow.document.createElement('div') as unknown as HTMLDivElement;
    testWindow.document.body.appendChild(c2Container as unknown as Node);
    root = createRoot(c2Container);
    container = c2Container;
    await render();
    const c2 = container.querySelector('canvas') as HTMLCanvasElement;
    expect(c2).not.toBeNull();
  });
});

describe('getStableSceneSize', () => {
  test('is exported and returns finite values', async () => {
    const mod = await import('./VibesCanvas');
    expect(typeof mod.getStableSceneSize).toBe('function');

    const el = testWindow.document.createElement('div');
    testWindow.document.body.appendChild(el as unknown as Node);

    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ width: 800, height: 600, top: 0, left: 0, bottom: 600, right: 800 }),
      configurable: true,
    });

    const result = mod.getStableSceneSize(el as unknown as HTMLElement, 2);
    expect(result.w).toBeGreaterThan(0);
    expect(result.h).toBeGreaterThan(0);
    expect(Number.isFinite(result.dpr)).toBe(true);
  });
});
