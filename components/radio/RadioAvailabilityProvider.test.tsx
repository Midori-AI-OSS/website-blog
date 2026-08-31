import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  RADIO_BROWSER_HEALTH_TIMEOUT_MS,
  RADIO_SERVER_HEALTH_TIMEOUT_MS,
  RadioAvailabilityGate,
  RadioAvailabilityProvider,
} from './RadioAvailabilityProvider';

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

function AppRouterHarness({
  children,
  onReplace = () => undefined,
}: {
  children: ReactNode;
  onReplace?: (href: string) => void;
}) {
  const router: AppRouterInstance = {
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    push: () => undefined,
    replace: onReplace,
    prefetch: () => undefined,
  };

  return (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value="/radio">{children}</PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
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
        <AppRouterHarness>
          <RadioAvailabilityProvider>
            <RadioAvailabilityGate>radio is ready</RadioAvailabilityGate>
          </RadioAvailabilityProvider>
        </AppRouterHarness>,
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

  test('ignores a legacy offline latch when boot health succeeds', async () => {
    testWindow.localStorage.setItem('midoriai.radio.offline:radio-health-test', 'true');
    let requests = 0;
    globalThis.fetch = (() => {
      requests += 1;
      return Promise.resolve(successResponse());
    }) as typeof fetch;

    await act(async () => {
      root.render(
        <AppRouterHarness>
          <RadioAvailabilityProvider>
            <RadioAvailabilityGate>radio is ready</RadioAvailabilityGate>
          </RadioAvailabilityProvider>
        </AppRouterHarness>,
      );
    });
    await flushEffects();

    expect(container.textContent).toBe('radio is ready');
    expect(requests).toBe(1);
  });

  test('redirects the radio page when boot health fails', async () => {
    const replacements: string[] = [];
    globalThis.fetch = (() => Promise.reject(new Error('radio unavailable'))) as typeof fetch;

    await act(async () => {
      root.render(
        <AppRouterHarness onReplace={(href) => replacements.push(href)}>
          <RadioAvailabilityProvider>
            <RadioAvailabilityGate redirectWhenOffline>radio is ready</RadioAvailabilityGate>
          </RadioAvailabilityProvider>
        </AppRouterHarness>,
      );
    });
    await flushEffects();

    expect(container.textContent).toBe('');
    expect(replacements).toEqual(['/']);
  });
});
