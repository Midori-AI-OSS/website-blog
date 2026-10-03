import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getInternalPageTransitionHref } from '../lib/pageTransitions';
import { PageLoadingIndicator } from './PageLoadingIndicator';
import { PageReadinessProvider } from './PageReadinessProvider';
import PageTransitionProvider, { usePageTransition } from './PageTransitionProvider';

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;
let pushes: string[];
let router: AppRouterInstance;
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
    { type: 'button', onClick: () => navigate('/lore/post') },
    'Open post',
  );
}

function TransitionHarness({ children, pathname }: { children: ReactNode; pathname: string }) {
  return createElement(
    AppRouterContext.Provider,
    { value: router },
    createElement(
      PathnameContext.Provider,
      { value: pathname },
      createElement(
        PageReadinessProvider,
        null,
        createElement(PageTransitionProvider, null, children),
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
  router = {
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    push: (href) => pushes.push(href),
    replace: () => undefined,
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

  test('ignores external, same-page, and non-http destinations', () => {
    expect(
      getInternalPageTransitionHref('https://other.example/blog', 'https://blog.example/'),
    ).toBeNull();
    expect(getInternalPageTransitionHref('/blog?sort=new', 'https://blog.example/blog')).toBeNull();
    expect(
      getInternalPageTransitionHref('mailto:team@example.com', 'https://blog.example/'),
    ).toBeNull();
  });
});

describe('provider navigation loading feedback', () => {
  test('shows an accessible loader after the grace period and hides it after the pathname changes', async () => {
    await renderPage();

    await clickNavigation();

    expect(pushes).toEqual(['/lore/post']);
    expect(container.querySelector('.page-transition-loader')).toBeNull();

    await waitFor(180);

    const loader = container.querySelector('.page-transition-loader');
    const pageContent = container.querySelector('.page-transition-root');
    const status = loader?.querySelector('[role="status"]');
    expect(pageContent?.getAttribute('aria-busy')).toBe('true');
    expect(pageContent?.hasAttribute('inert')).toBe(true);
    expect(loader?.hasAttribute('aria-busy')).toBe(false);
    expect(status?.closest('[aria-busy="true"]')).toBeNull();
    expect(status?.textContent).toContain('Loading page');

    await renderPage('/lore/post');

    expect(container.querySelector('.page-transition-loader')).toBeNull();
    expect(container.querySelector('.page-transition-root')?.hasAttribute('inert')).toBe(false);
  });

  test('does not show the loader when the route changes before the grace period', async () => {
    await renderPage();
    await clickNavigation();
    await renderPage('/lore/post');

    await waitFor(180);

    expect(container.querySelector('.page-transition-loader')).toBeNull();
  });

  test('uses Next loading fallback first and shows the transition loader if that fallback clears while navigation is pending', async () => {
    await renderPage('/blog', true);
    await clickNavigation();

    await waitFor(180);

    expect(container.querySelector('.page-loading')).not.toBeNull();
    expect(container.querySelector('.page-transition-loader')).toBeNull();

    await renderPage('/blog', false);

    expect(container.querySelector('.page-transition-loader')).not.toBeNull();
  });
});
