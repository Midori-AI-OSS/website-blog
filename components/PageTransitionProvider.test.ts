import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { act, createElement, type ReactNode, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getInternalPageTransitionHref } from '../lib/pageTransitions';
import { PageLoadingIndicator } from './PageLoadingIndicator';
import { PageReadinessProvider, usePageReadiness } from './PageReadinessProvider';
import PageTransitionProvider, {
  PageTransitionContent,
  usePageTransition,
} from './PageTransitionProvider';

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;
let pushes: string[];
let router: AppRouterInstance;
let replacements: string[];
let destination = '/lore/post';
let replaceNavigation = false;
let originalWindow: typeof globalThis.window;
let originalDocument: typeof globalThis.document;
let originalNavigator: typeof globalThis.navigator;
let originalNode: typeof globalThis.Node;
let originalElement: typeof globalThis.Element;
let originalHTMLElement: typeof globalThis.HTMLElement;
let originalMutationObserver: typeof globalThis.MutationObserver;
let originalActEnvironment: unknown;

function NavigationTrigger() {
  const navigate = usePageTransition();
  return createElement(
    'button',
    { type: 'button', onClick: () => navigate(destination, { replace: replaceNavigation }) },
    'Open post',
  );
}

function ReadyShell() {
  const { markShellVisible, completeRouteEntry } = usePageReadiness();
  useLayoutEffect(() => {
    markShellVisible();
    completeRouteEntry();
  }, [markShellVisible, completeRouteEntry]);
  return createElement('main', null, createElement('h1', null, 'Destination content'));
}

function TransitionHarness({ children, pathname }: { children: ReactNode; pathname: string }) {
  return createElement(
    AppRouterContext.Provider,
    { value: router },
    createElement(
      PathnameContext.Provider,
      { value: pathname.split('?')[0] },
      createElement(
        SearchParamsContext.Provider,
        { value: new URLSearchParams(pathname.split('?')[1] ?? '') },
        createElement(
          PageReadinessProvider,
          null,
          createElement(
            PageTransitionProvider,
            null,
            createElement(
              'nav',
              { 'aria-label': 'Primary navigation' },
              createElement('a', { href: '/lore' }, 'Lore'),
              createElement('a', { href: '/blog' }, 'Blog'),
            ),
            createElement(PageTransitionContent, null, children),
          ),
        ),
      ),
    ),
  );
}

async function renderPage(pathname = '/blog', showFallback = false): Promise<void> {
  await act(async () => {
    root.render(
      createElement(
        TransitionHarness,
        { pathname },
        createElement(NavigationTrigger),
        createElement(ReadyShell),
        showFallback ? createElement(PageLoadingIndicator) : null,
      ),
    );
  });
}

async function clickNavigation(): Promise<void> {
  await act(async () => {
    container.querySelector('button')?.click();
  });
}

async function waitFor(milliseconds: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  });
}

beforeEach(() => {
  testWindow = new Window({ url: 'http://localhost:3000/blog' });
  originalWindow = globalThis.window;
  originalDocument = globalThis.document;
  originalNavigator = globalThis.navigator;
  originalNode = globalThis.Node;
  originalElement = globalThis.Element;
  originalHTMLElement = globalThis.HTMLElement;
  originalMutationObserver = globalThis.MutationObserver;
  originalActEnvironment = (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = testWindow as unknown as Window & typeof globalThis;
  globalThis.document = testWindow.document;
  globalThis.navigator = testWindow.navigator;
  globalThis.Node = testWindow.Node;
  globalThis.Element = testWindow.Element;
  globalThis.HTMLElement = testWindow.HTMLElement;
  globalThis.MutationObserver = testWindow.MutationObserver;
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  testWindow.matchMedia = (() => ({ matches: true })) as typeof testWindow.matchMedia;
  container = testWindow.document.createElement('div');
  testWindow.document.body.append(container);
  root = createRoot(container);
  pushes = [];
  replacements = [];
  destination = '/lore/post';
  replaceNavigation = false;
  router = {
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    push: (href) => pushes.push(href),
    replace: (href) => replacements.push(href),
    prefetch: () => undefined,
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
  globalThis.navigator = originalNavigator;
  globalThis.Node = originalNode;
  globalThis.Element = originalElement;
  globalThis.HTMLElement = originalHTMLElement;
  globalThis.MutationObserver = originalMutationObserver;
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

describe('page transition destinations', () => {
  test('returns a same-origin route with its query and hash', () => {
    expect(
      getInternalPageTransitionHref('/transition-test?source=home#ready', 'https://blog.example/'),
    ).toBe('/transition-test?source=home#ready');
  });

  test('ignores external, identical, hash-only, and non-http destinations', () => {
    expect(
      getInternalPageTransitionHref('https://other.example/blog', 'https://blog.example/'),
    ).toBeNull();
    expect(getInternalPageTransitionHref('/blog#section', 'https://blog.example/blog')).toBeNull();
    expect(getInternalPageTransitionHref('/blog', 'https://blog.example/blog')).toBeNull();
    expect(
      getInternalPageTransitionHref('mailto:team@example.com', 'https://blog.example/'),
    ).toBeNull();
  });

  test('includes same-path query changes that load different content', () => {
    expect(
      getInternalPageTransitionHref(
        '/species-care/riley?version=2',
        'https://blog.example/species-care/riley?version=1',
      ),
    ).toBe('/species-care/riley?version=2');
  });

  test('treats equivalent query encodings as the same content destination', () => {
    expect(
      getInternalPageTransitionHref('/blog?x=a+b', 'https://blog.example/blog?x=a%20b'),
    ).toBeNull();
  });
});

describe('shared full-screen navigation lifecycle', () => {
  const overlay = () => container.querySelector('.page-transition-scrim');
  const phase = () => overlay()?.getAttribute('data-phase');
  const locked = () => container.querySelector('.page-transition-root')?.hasAttribute('inert');

  async function settledPage() {
    await renderPage();
    await waitFor(560);
  }

  test('keeps primary navigation available while destination content is locked', async () => {
    await settledPage();
    await clickNavigation();
    expect(phase()).toBe('waiting');
    expect(locked()).toBe(true);
    expect(Boolean(container.querySelector('nav')?.closest('[inert]'))).toBe(false);
    expect(Boolean(container.querySelector('nav')?.closest('[aria-busy="true"]'))).toBe(false);
  });

  test('a primary navigation link can supersede a pending post without repeating its request', async () => {
    await settledPage();
    await clickNavigation();
    await act(async () => container.querySelector<HTMLAnchorElement>('nav a')?.click());
    await act(async () => container.querySelector<HTMLAnchorElement>('nav a')?.click());
    expect(pushes).toEqual(['/lore/post', '/lore']);
    await renderPage('/lore/post');
    await waitFor(40);
    expect(phase()).toBe('waiting');
    await renderPage('/lore');
    await waitFor(40);
    expect(phase()).toBe('idle');
  });

  test('primary navigation can cancel loading and return to the current page', async () => {
    await settledPage();
    await clickNavigation();
    await act(async () =>
      container.querySelector<HTMLAnchorElement>('nav a[href="/blog"]')?.click(),
    );
    await waitFor(40);
    expect(pushes).toEqual(['/lore/post', '/blog']);
    expect(phase()).toBe('idle');
    expect(locked()).toBe(false);
  });

  test('stays covered until destination content commits even after animation safety timers expire', async () => {
    testWindow.matchMedia = (() => ({ matches: false })) as typeof testWindow.matchMedia;
    await settledPage();
    await clickNavigation();
    await waitFor(560);
    expect(pushes).toEqual(['/lore/post']);
    expect(phase()).toBe('waiting');
    expect(locked()).toBe(true);
    await waitFor(600);
    expect(phase()).toBe('waiting');
    await renderPage('/lore/post');
    await waitFor(40);
    expect(phase()).toBe('entering');
    expect(locked()).toBe(true);
    await waitFor(560);
    expect(phase()).toBe('idle');
    expect(locked()).toBe(false);
    expect(testWindow.document.activeElement?.tagName).toBe('H1');
  });

  test('pathname commit cannot uncover an active fallback and there is only one loading status', async () => {
    await settledPage();
    await clickNavigation();
    await renderPage('/lore/post', true);
    await waitFor(180);
    expect(phase()).toBe('waiting');
    expect(locked()).toBe(true);
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);
    expect(container.querySelector('[role="status"]')?.closest('[aria-busy="true"]')).toBeNull();
    await renderPage('/lore/post');
    await waitFor(40);
    expect(phase()).toBe('idle');
    expect(locked()).toBe(false);
  });

  test('deduplicates clicks while waiting and preserves a newer replacement after old phase timers', async () => {
    await settledPage();
    await clickNavigation();
    await clickNavigation();
    expect(pushes).toEqual(['/lore/post']);
    replaceNavigation = true;
    destination = '/';
    await clickNavigation();
    expect(replacements).toEqual(['/']);
    await waitFor(600);
    expect(phase()).toBe('waiting');
    await renderPage('/');
    await waitFor(40);
    expect(phase()).toBe('idle');
  });

  test('same-path query navigation waits for the new query to commit', async () => {
    await settledPage();
    destination = '/blog?version=2';
    await clickNavigation();
    expect(pushes).toEqual(['/blog?version=2']);
    await waitFor(180);
    expect(phase()).toBe('waiting');
    await renderPage('/blog?version=2');
    await waitFor(40);
    expect(phase()).toBe('idle');
  });

  test('observes native history without issuing another router request', async () => {
    await settledPage();
    await act(async () => {
      testWindow.history.pushState({}, '', '/lore');
      testWindow.dispatchEvent(new testWindow.PopStateEvent('popstate'));
    });
    expect(phase()).toBe('waiting');
    expect(pushes).toEqual([]);
    await renderPage('/lore');
    await waitFor(40);
    expect(phase()).toBe('idle');
  });

  test('returning Forward to the already committed route cancels a pending Back transition', async () => {
    await settledPage();
    await act(async () => {
      testWindow.history.pushState({}, '', '/lore');
      testWindow.dispatchEvent(new testWindow.PopStateEvent('popstate'));
    });
    expect(phase()).toBe('waiting');
    await act(async () => {
      testWindow.history.pushState({}, '', '/blog');
      testWindow.dispatchEvent(new testWindow.PopStateEvent('popstate'));
    });
    await waitFor(40);
    expect(phase()).toBe('idle');
    expect(locked()).toBe(false);
    expect(pushes).toEqual([]);
  });

  test('hash history on equivalent query encodings does not start a loader', async () => {
    await renderPage('/blog?x=a%20b');
    await waitFor(560);
    await act(async () => {
      testWindow.history.replaceState({}, '', '/blog?x=a%20b');
      testWindow.dispatchEvent(new testWindow.PopStateEvent('popstate'));
    });
    await waitFor(40);
    expect(phase()).toBe('idle');
    expect(locked()).toBe(false);
  });

  test('a superseded intermediate route cannot reveal the replacement destination', async () => {
    await settledPage();
    await clickNavigation();
    replaceNavigation = true;
    destination = '/';
    await clickNavigation();
    await renderPage('/lore/post');
    await waitFor(40);
    expect(phase()).toBe('waiting');
    expect(locked()).toBe(true);
    await renderPage('/');
    await waitFor(40);
    expect(phase()).toBe('idle');
  });

  test('malformed fragment encoding does not crash focus restoration', async () => {
    await settledPage();
    destination = '/lore/post#100%';
    await clickNavigation();
    await renderPage('/lore/post');
    await waitFor(40);
    expect(phase()).toBe('idle');
    expect(locked()).toBe(false);
    expect(testWindow.document.activeElement?.tagName).toBe('H1');
  });

  test('covers a fallback from navigation outside the hook and clears it after readiness', async () => {
    await settledPage();
    await renderPage('/blog', true);
    await waitFor(180);
    expect(phase()).toBe('waiting');
    expect(locked()).toBe(true);
    await renderPage('/blog');
    await waitFor(40);
    expect(phase()).toBe('idle');
  });

  test('fast cached content reveals once without showing a loading status', async () => {
    testWindow.matchMedia = (() => ({ matches: false })) as typeof testWindow.matchMedia;
    await settledPage();
    await clickNavigation();
    expect(pushes).toEqual([]);
    expect(phase()).toBe('leaving');
    await waitFor(560);
    await renderPage('/lore/post');
    await waitFor(40);
    expect(phase()).toBe('entering');
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelectorAll('.page-transition-scrim').length).toBe(1);
    await waitFor(560);
    expect(phase()).toBe('idle');
  });

  test('shows recovery for stalled navigation and ignores recovery callbacks from superseded requests', async () => {
    const callbacks: (() => void)[] = [];
    const originalSetTimeout = testWindow.setTimeout;
    testWindow.setTimeout = ((handler: TimerHandler, delay?: number) => {
      if (delay === 30_000 && typeof handler === 'function') callbacks.push(handler as () => void);
      return originalSetTimeout(handler, delay);
    }) as typeof testWindow.setTimeout;
    await settledPage();
    await clickNavigation();
    const oldCallback = callbacks.at(-1);
    replaceNavigation = true;
    destination = '/';
    await clickNavigation();
    await act(async () => oldCallback?.());
    expect(container.querySelector('.page-transition-recovery')).toBeNull();
    await act(async () => callbacks.at(-1)?.());
    expect(container.querySelector('.page-transition-recovery')?.textContent).toContain(
      'Try again',
    );
    expect(container.querySelectorAll('.page-transition-recovery button').length).toBe(2);
    await renderPage('/');
    await waitFor(40);
    expect(container.querySelector('.page-transition-recovery')).toBeNull();
  });

  test('restores interaction if router navigation throws synchronously', async () => {
    await settledPage();
    router.push = () => {
      throw new Error('router unavailable');
    };
    await clickNavigation();
    expect(phase()).toBe('idle');
    expect(locked()).toBe(false);
  });

  test('keeps hash jumps and modified link clicks out of the full-screen lifecycle', async () => {
    await settledPage();
    const anchor = testWindow.document.createElement('a');
    anchor.href = '/lore';
    container.querySelector('.page-transition-root')?.append(anchor);
    await act(async () => {
      anchor.dispatchEvent(
        new testWindow.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
      );
    });
    expect(pushes).toEqual([]);
    expect(phase()).toBe('idle');
  });
});
