import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PageReadinessProvider, usePageReadiness } from '../PageReadinessProvider';
import RadioWidget from './RadioWidget';

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;
let currentTrackId = 'track-1';
let lastAudio: MockAudio | null = null;
let intervalEntries = new Map<number, { delay: number; callback: () => void }>();
let timeoutEntries = new Map<number, { delay: number; callback: () => void }>();
let nextTimerId = 1;
let artworkFixture = 0;
let serverArtwork = false;
let artworkFetchFails = false;
let holdImages = false;
let imageAttempts: MockImage[] = [];
let holdArtMetadata = false;
let pendingArtMetadata: (() => void)[] = [];

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
      typeof listener === 'function' ? listener : (event: Event) => listener.handleEvent(event);
    listeners.add(normalized);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }

    for (const current of listeners) {
      if (
        current === listener ||
        (typeof listener !== 'function' && current === listener.handleEvent)
      ) {
        listeners.delete(current);
      }
    }
  }

  emit(type: string) {
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

  url = '';
  requestedUrl = '';
  set src(value: string) {
    this.url = value;
    if (!value) return;
    this.requestedUrl = value;
    imageAttempts.push(this);
    if (holdImages) return;
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
    requestAnimationFrame: (cb: FrameRequestCallback) =>
      originalSetTimeout(() => cb(Date.now()), 0),
    cancelAnimationFrame: (id: number) => originalClearTimeout(id),
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
}

function installTimers() {
  intervalEntries = new Map();
  timeoutEntries = new Map();
  nextTimerId = 1;

  const setIntervalMock = ((handler: TimerHandler, delay?: number) => {
    nextTimerId += 1;
    const id = nextTimerId;
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

    nextTimerId += 1;
    const id = nextTimerId;
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
    const requestedChannel =
      new URL(url, 'http://localhost:3000').searchParams.get('channel') ?? 'all';

    if (url.endsWith('/api/radio-images')) {
      return jsonResponse({
        images: [`/radio-test/${artworkFixture}/fallback.png`],
        placeholder: `/radio-test/${artworkFixture}/placeholder.png`,
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
          channels: [
            { name: 'all', track_count: 10 },
            { name: 'chill', track_count: 5 },
          ],
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
          channel: requestedChannel,
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
      if (artworkFetchFails) throw new Error('Artwork metadata unavailable');
      const requestedTrackId = currentTrackId;
      if (holdArtMetadata) await new Promise<void>((resolve) => pendingArtMetadata.push(resolve));
      return jsonResponse({
        version: 'radio.v1',
        ok: true,
        now: '2026-04-17T00:00:00.000Z',
        data: {
          channel: requestedChannel,
          track_id: requestedTrackId,
          has_art: serverArtwork,
          mime: null,
          art_url: serverArtwork
            ? `https://radio.example/${artworkFixture}/image?channel=${requestedChannel}`
            : '',
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

function ArtworkReadiness({ ready }: { ready: boolean }) {
  const { markShellVisible, completeRouteEntry, setNavigationTransitionActive } =
    usePageReadiness();
  useLayoutEffect(() => {
    markShellVisible();
    completeRouteEntry();
    setNavigationTransitionActive(!ready);
  }, [ready, markShellVisible, completeRouteEntry, setNavigationTransitionActive]);
  return null;
}

async function renderWidget(ready = true) {
  await act(async () => {
    root.render(
      <PageReadinessProvider>
        <ArtworkReadiness ready={ready} />
        <RadioWidget />
      </PageReadinessProvider>,
    );
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
  artworkFixture++;
  serverArtwork = false;
  artworkFetchFails = false;
  holdImages = false;
  imageAttempts = [];
  holdArtMetadata = false;
  pendingArtMetadata = [];
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
  function artworkBackground() {
    const background = container.querySelector('.MuiSheet-root > div');
    return background ? testWindow.getComputedStyle(background).backgroundImage : '';
  }

  function serverImages(trackId = 'track-1') {
    return imageAttempts.filter(
      (image) =>
        image.requestedUrl.startsWith('https://radio.example/') &&
        new URL(image.requestedUrl).searchParams.get('midoriai_track') === trackId,
    );
  }

  test('navigation retains loaded artwork without restarting the same image', async () => {
    serverArtwork = true;
    await renderWidget();
    await waitForCondition(
      () => artworkBackground().includes('midoriai_track=track-1'),
      'Artwork should load',
    );
    const loadedBackground = artworkBackground();
    const attempts = imageAttempts.length;
    await renderWidget(false);
    expect(artworkBackground()).toBe(loadedBackground);
    await renderWidget(true);
    expect(artworkBackground()).toBe(loadedBackground);
    expect(imageAttempts.length).toBe(attempts);
  });

  test('a pending artwork image can finish across navigation without being discarded', async () => {
    serverArtwork = true;
    holdImages = true;
    await renderWidget();
    await waitForCondition(() => serverImages().length > 0, 'Server artwork should start');
    const pendingImage = serverImages()[0];
    await renderWidget(false);
    await act(async () => {
      pendingImage.onload?.();
      await flushEffects();
    });
    expect(artworkBackground()).toContain('midoriai_track=track-1');
    await renderWidget(true);
    expect(artworkBackground()).toContain('midoriai_track=track-1');
    expect(serverImages().length).toBe(1);
  });

  test('new song loading keeps the previous image until the replacement succeeds', async () => {
    serverArtwork = true;
    await renderWidget();
    await waitForCondition(
      () => artworkBackground().includes('midoriai_track=track-1'),
      'First artwork should load',
    );
    const first = artworkBackground();
    holdImages = true;
    currentTrackId = 'track-2';
    await runInterval(2000);
    await waitForCondition(() => serverImages('track-2').length > 0, 'Second artwork should start');
    expect(artworkBackground()).toBe(first);
    await act(async () => {
      serverImages('track-2')[0].onload?.();
      await flushEffects();
    });
    expect(artworkBackground()).toContain('midoriai_track=track-2');
  });

  test('late artwork from an older song cannot replace the current song image', async () => {
    serverArtwork = true;
    holdImages = true;
    await renderWidget();
    await waitForCondition(() => serverImages().length > 0, 'First artwork should start');
    const oldImage = serverImages()[0];
    currentTrackId = 'track-2';
    await runInterval(2000);
    await waitForCondition(() => serverImages('track-2').length > 0, 'Second artwork should start');
    await act(async () => {
      serverImages('track-2')[0].onload?.();
      await flushEffects();
    });
    await act(async () => {
      oldImage.onload?.();
      await flushEffects();
    });
    expect(artworkBackground()).toContain('midoriai_track=track-2');
  });

  test('song changes wait for matching artwork metadata without briefly selecting fallback', async () => {
    serverArtwork = true;
    await renderWidget();
    await waitForCondition(
      () => artworkBackground().includes('midoriai_track=track-1'),
      'First artwork should load',
    );
    const first = artworkBackground();
    const attempts = imageAttempts.length;
    holdArtMetadata = true;
    currentTrackId = 'track-2';
    await runInterval(2000);
    expect(pendingArtMetadata.length).toBe(1);
    expect(artworkBackground()).toBe(first);
    expect(imageAttempts.length).toBe(attempts);
    await act(async () => {
      pendingArtMetadata[0]();
      await flushEffects();
    });
    await waitForCondition(
      () => artworkBackground().includes('midoriai_track=track-2'),
      'Matching artwork should replace the first',
    );
  });

  for (const failed of [false, true]) {
    test(`returning to a song resumes artwork after its ${failed ? 'failed' : 'successful'} image was discarded`, async () => {
      serverArtwork = true;
      holdImages = true;
      await renderWidget();
      await waitForCondition(() => serverImages().length > 0, 'First artwork should start');
      const firstImage = serverImages()[0];
      holdArtMetadata = true;
      currentTrackId = 'track-2';
      await runInterval(2000);
      await act(async () => {
        if (failed) firstImage.onerror?.();
        else firstImage.onload?.();
        await flushEffects();
      });
      currentTrackId = 'track-1';
      await runInterval(2000);
      holdArtMetadata = false;
      await act(async () => {
        for (const release of pendingArtMetadata) release();
        await flushEffects();
      });
      if (failed) {
        expect(serverImages().length).toBe(2);
        await act(async () => {
          serverImages().at(-1)?.onerror?.();
          await flushEffects();
        });
        const fallback = imageAttempts.find((image) => image.url.endsWith('/fallback.png'));
        expect(Boolean(fallback)).toBe(true);
        await act(async () => {
          fallback?.onload?.();
          await flushEffects();
        });
        expect(artworkBackground()).toContain('/fallback.png');
      } else {
        expect(serverImages().length).toBe(1);
        expect(artworkBackground()).toContain('midoriai_track=track-1');
      }
      const loaded = artworkBackground();
      const attempts = imageAttempts.length;
      await renderWidget(false);
      await renderWidget(true);
      expect(artworkBackground()).toBe(loaded);
      expect(imageAttempts.length).toBe(attempts);
    });
  }

  test('failed server artwork uses fallback once and navigation does not retry it', async () => {
    serverArtwork = true;
    holdImages = true;
    await renderWidget();
    await waitForCondition(() => serverImages().length > 0, 'Server artwork should start');
    await act(async () => {
      serverImages()[0].onerror?.();
      await flushEffects();
    });
    const fallback = imageAttempts.find((image) => image.url.endsWith('/fallback.png'));
    expect(Boolean(fallback)).toBe(true);
    await act(async () => {
      fallback?.onload?.();
      await flushEffects();
    });
    const loaded = artworkBackground();
    expect(loaded).toContain('/fallback.png');
    const attempts = imageAttempts.length;
    await renderWidget(false);
    await renderWidget(true);
    expect(artworkBackground()).toBe(loaded);
    expect(imageAttempts.length).toBe(attempts);
    expect(serverImages().length).toBe(1);
  });

  test('artwork waits for initial page readiness before loading', async () => {
    serverArtwork = true;
    await renderWidget(false);
    expect(imageAttempts.length).toBe(0);
    await renderWidget(true);
    await waitForCondition(
      () => artworkBackground().includes('midoriai_track=track-1'),
      'Artwork should load after initial readiness',
    );
    expect(serverImages().length).toBe(1);
  });

  test('a failed pending image waits for page readiness before starting fallback', async () => {
    serverArtwork = true;
    holdImages = true;
    await renderWidget();
    await waitForCondition(() => serverImages().length > 0, 'Server artwork should start');
    const pending = serverImages()[0];
    const attempts = imageAttempts.length;
    await renderWidget(false);
    await act(async () => {
      pending.onerror?.();
      await flushEffects();
    });
    expect(imageAttempts.length).toBe(attempts);
    await renderWidget(true);
    expect(serverImages().length).toBe(1);
    const fallback = imageAttempts.find((image) => image.url.endsWith('/fallback.png'));
    expect(Boolean(fallback)).toBe(true);
    await act(async () => {
      fallback?.onload?.();
      await flushEffects();
    });
    expect(artworkBackground()).toContain('/fallback.png');
  });

  test('temporary artwork metadata errors retain known artwork for the same song', async () => {
    serverArtwork = true;
    await renderWidget();
    await waitForCondition(
      () => artworkBackground().includes('midoriai_track=track-1'),
      'Artwork should load',
    );
    const loaded = artworkBackground();
    artworkFetchFails = true;
    await runInterval(2000);
    expect(artworkBackground()).toBe(loaded);
  });

  test('channel changes resolve matching artwork and navigation keeps the result', async () => {
    serverArtwork = true;
    await renderWidget();
    await waitForCondition(
      () => artworkBackground().includes('channel=all'),
      'Initial channel art should load',
    );
    await act(async () => {
      const select = container.querySelector('select');
      if (!select) throw new Error('Missing channel selector');
      select.value = 'chill';
      select.dispatchEvent(new testWindow.Event('change', { bubbles: true }));
      await flushEffects();
    });
    await waitForCondition(
      () => artworkBackground().includes('channel=chill'),
      'New channel art should load',
    );
    const loaded = artworkBackground();
    const attempts = imageAttempts.length;
    await renderWidget(false);
    await renderWidget(true);
    expect(artworkBackground()).toBe(loaded);
    expect(imageAttempts.length).toBe(attempts);
  });

  test('metadata failure for a new song selects fallback instead of keeping stale server metadata', async () => {
    serverArtwork = true;
    await renderWidget();
    await waitForCondition(
      () => artworkBackground().includes('midoriai_track=track-1'),
      'Initial artwork should load',
    );
    artworkFetchFails = true;
    currentTrackId = 'track-2';
    await runInterval(2000);
    await waitForCondition(
      () => artworkBackground().includes('/fallback.png'),
      'New song should use fallback',
    );
    const attempts = imageAttempts.length;
    await renderWidget(false);
    await renderWidget(true);
    expect(imageAttempts.length).toBe(attempts);
  });

  test('starts playback with a stream URL on play', async () => {
    await renderWidget();
    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 1,
      'Expected initial playback to start',
    );

    const src = lastAudio?.src ?? '';
    expect(src).toContain('/api/radio/stream');
    expect(src).toContain('channel=all');
    expect(src).toContain('q=medium');
  });

  test('stops playback and clears source on stop', async () => {
    await renderWidget();
    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 1,
      'Expected playback to start',
    );

    const playButton = getPrimaryButton();
    expect(playButton).not.toBeNull();

    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.paused === true,
      'Expected playback to stop',
    );

    expect(lastAudio?.src).toBe('');
  });

  test('does NOT reconnect on track change (server handles streaming)', async () => {
    await renderWidget();
    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 1,
      'Expected initial playback to start',
    );

    const initialPlayCalls = lastAudio?.playCalls;

    currentTrackId = 'track-2';
    await runInterval(2_000);

    await act(async () => {
      await flushEffects();
    });

    expect(lastAudio?.playCalls).toBe(initialPlayCalls);
  });

  test('reconnects after audio element errors using the initial ramp delay', async () => {
    await renderWidget();
    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 1,
      'Expected initial playback to start',
    );

    const playCallsBefore = lastAudio?.playCalls;

    await act(async () => {
      lastAudio?.emit('error');
      await flushEffects();
    });

    expect([...timeoutEntries.values()].some((entry) => entry.delay === 100)).toBe(true);
    expect(lastAudio?.playCalls).toBe(playCallsBefore);

    await runTimeout(100);

    expect(lastAudio?.playCalls).toBe(playCallsBefore ? playCallsBefore + 1 : undefined);
  });

  test('resets the reconnect ramp after playback succeeds', async () => {
    await renderWidget();
    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 1,
      'Expected initial playback to start',
    );

    await act(async () => {
      lastAudio?.emit('error');
      await flushEffects();
    });
    await runTimeout(100);

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 2,
      'Expected the first reconnect to start playback',
    );

    await act(async () => {
      lastAudio?.emit('error');
      await flushEffects();
    });

    expect([...timeoutEntries.values()].some((entry) => entry.delay === 100)).toBe(true);
    expect([...timeoutEntries.values()].some((entry) => entry.delay === 200)).toBe(false);
  });

  test('cancels a pending reconnect when playback is stopped', async () => {
    await renderWidget();
    await clickPrimaryButton();

    await waitForCondition(
      () => lastAudio !== null && lastAudio.playCalls === 1,
      'Expected initial playback to start',
    );

    await act(async () => {
      lastAudio?.emit('error');
      await flushEffects();
    });
    expect([...timeoutEntries.values()].some((entry) => entry.delay === 100)).toBe(true);

    await clickPrimaryButton();

    expect([...timeoutEntries.values()].some((entry) => entry.delay === 100)).toBe(false);
  });
});
