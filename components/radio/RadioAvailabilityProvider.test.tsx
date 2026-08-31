import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { radioOfflineStorageKey } from '@/lib/radio/availability';
import { useRadioAvailability } from './RadioAvailabilityProvider';

const {
  RadioAvailabilityProvider,
  RADIO_BROWSER_HEALTH_TIMEOUT_MS,
  RADIO_SERVER_HEALTH_TIMEOUT_MS,
} = await import('./RadioAvailabilityProvider');

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;
let originalFetch: typeof globalThis.fetch;
let originalWindow: typeof globalThis.window;
let originalDocument: typeof globalThis.document;
let originalNavigator: typeof globalThis.navigator;
let originalNode: typeof globalThis.Node;
let originalHTMLElement: typeof globalThis.HTMLElement;
let originalMutationObserver: typeof globalThis.MutationObserver;

function successResponse(): Response {
  return new Response(
    JSON.stringify({
      version: 'radio.v1',
      ok: true,
      now: '2026-08-31T00:00:00.000Z',
      data: { status: 'ready' },
      error: null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function RadioAvailabilityProbe() {
  const { status } = useRadioAvailability();

  return status === 'online' ? <span>radio is ready</span> : null;
}

async function flushEffects(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  testWindow = new Window({ url: 'http://localhost:3000/radio' });
  originalFetch = globalThis.fetch;
  originalWindow = globalThis.window;
  originalDocument = globalThis.document;
  originalNavigator = globalThis.navigator;
  originalNode = globalThis.Node;
  originalHTMLElement = globalThis.HTMLElement;
  originalMutationObserver = globalThis.MutationObserver;
  globalThis.window = testWindow as unknown as Window & typeof globalThis;
  globalThis.document = testWindow.document;
  globalThis.navigator = testWindow.navigator;
  globalThis.Node = testWindow.Node;
  globalThis.HTMLElement = testWindow.HTMLElement;
  globalThis.MutationObserver = testWindow.MutationObserver;
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = testWindow.document.createElement('div');
  testWindow.document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
  globalThis.navigator = originalNavigator;
  globalThis.Node = originalNode;
  globalThis.HTMLElement = originalHTMLElement;
  globalThis.MutationObserver = originalMutationObserver;
});

describe('RadioAvailabilityProvider health startup', () => {
  test('keeps the gate closed until a delayed health response beyond the old budget succeeds', async () => {
    globalThis.fetch = ((_input, init) =>
      new Promise<Response>((resolve, reject) => {
        const responseTimer = setTimeout(() => resolve(successResponse()), 4_000);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(responseTimer);
          reject(new DOMException('aborted', 'AbortError'));
        });
      })) as typeof fetch;

    await act(async () => {
      root.render(
        <RadioAvailabilityProvider>
          <RadioAvailabilityProbe />
        </RadioAvailabilityProvider>,
      );
    });
    expect(container.textContent).toBe('');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 4_100));
    });

    expect(container.textContent).toBe('radio is ready');
  });

  test('uses matching five-and-a-half-second server and browser health budgets', () => {
    expect(RADIO_SERVER_HEALTH_TIMEOUT_MS).toBe(5_500);
    expect(RADIO_BROWSER_HEALTH_TIMEOUT_MS).toBe(5_500);
  });

  test('keeps an existing offline latch closed without making a health request', async () => {
    testWindow.localStorage.setItem(radioOfflineStorageKey(), 'true');
    let requests = 0;
    globalThis.fetch = (() => {
      requests += 1;
      return Promise.resolve(successResponse());
    }) as typeof fetch;

    await act(async () => {
      root.render(
        <RadioAvailabilityProvider>
          <RadioAvailabilityProbe />
        </RadioAvailabilityProvider>,
      );
    });
    await flushEffects();

    expect(container.textContent).toBe('');
    expect(requests).toBe(0);
  });
});
