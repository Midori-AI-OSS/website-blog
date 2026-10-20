import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import Template from '@/app/template';
import { PageLoadingIndicator } from './PageLoadingIndicator';
import {
  PageReadinessProvider,
  useOptionalPageReadiness,
  usePageReadiness,
} from './PageReadinessProvider';

function OptionalProbe() {
  return <output>{useOptionalPageReadiness() === null ? 'absent' : 'present'}</output>;
}

function StrictProbe() {
  usePageReadiness();
  return null;
}

describe('framework rendering outside the application layout', () => {
  test.each([false, true])('renders the root template with provider=%s', (withProvider) => {
    const template = <Template>Destination content</Template>;
    const html = renderToStaticMarkup(
      withProvider ? <PageReadinessProvider>{template}</PageReadinessProvider> : template,
    );
    expect(html).toBe('<div class="page-route-content">Destination content</div>');
  });

  test.each([false, true])('renders loading markup with provider=%s', (withProvider) => {
    const loading = <PageLoadingIndicator />;
    const html = renderToStaticMarkup(
      withProvider ? <PageReadinessProvider>{loading}</PageReadinessProvider> : loading,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('Loading page');
  });

  test('optional access reflects provider presence while strict access still throws', () => {
    expect(renderToStaticMarkup(<OptionalProbe />)).toContain('absent');
    expect(
      renderToStaticMarkup(
        <PageReadinessProvider>
          <OptionalProbe />
        </PageReadinessProvider>,
      ),
    ).toContain('present');
    expect(() => renderToStaticMarkup(<StrictProbe />)).toThrow(
      'usePageReadiness must be used inside PageReadinessProvider',
    );
  });
});

describe('framework readiness effects', () => {
  let root: Root;
  let container: HTMLDivElement;
  let beginRouteEntry: (() => void) | undefined;
  const originals = new Map<string, unknown>();

  function Probe() {
    const readiness = usePageReadiness();
    beginRouteEntry = readiness.beginRouteEntry;
    return (
      <output
        data-count={readiness.loadingFallbackCount}
        data-route-ready={String(readiness.routeEntryComplete)}
      />
    );
  }

  async function render(showLoading: boolean, withProvider = true, routeKey = 'initial') {
    await act(async () => {
      const content = (
        <>
          <Template key={routeKey}>Destination content</Template>
          {showLoading ? <PageLoadingIndicator /> : null}
          {withProvider ? <Probe /> : null}
        </>
      );
      root.render(
        <StrictMode>
          {withProvider ? <PageReadinessProvider>{content}</PageReadinessProvider> : content}
        </StrictMode>,
      );
    });
  }

  beforeEach(() => {
    const testWindow = new Window({ url: 'http://localhost:3000' });
    const globals: Record<string, unknown> = {
      window: testWindow,
      document: testWindow.document,
      navigator: testWindow.navigator,
      Node: testWindow.Node,
      Element: testWindow.Element,
      HTMLElement: testWindow.HTMLElement,
      MutationObserver: testWindow.MutationObserver,
      IS_REACT_ACT_ENVIRONMENT: true,
    };
    for (const [key, value] of Object.entries(globals)) {
      originals.set(key, (globalThis as Record<string, unknown>)[key]);
      (globalThis as Record<string, unknown>)[key] = value;
    }
    beginRouteEntry = undefined;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    for (const [key, value] of originals) {
      if (value === undefined) delete (globalThis as Record<string, unknown>)[key];
      else (globalThis as Record<string, unknown>)[key] = value;
    }
    originals.clear();
  });

  test('providerless client template and loading markup remain renderable in Strict Mode', async () => {
    await render(true, false);
    expect(container.querySelector('.page-route-content')?.textContent).toBe('Destination content');
    expect(container.querySelector('[aria-busy="true"]') !== null).toBe(true);
  });

  test('completes route entry and cleans up loading registrations without accumulating in Strict Mode', async () => {
    await render(true);
    expect(container.querySelector('output')?.dataset.routeReady).toBe('true');
    expect(container.querySelector('output')?.dataset.count).toBe('1');

    await act(async () => beginRouteEntry?.());
    expect(container.querySelector('output')?.dataset.routeReady).toBe('false');
    expect(container.querySelector('output')?.dataset.count).toBe('1');

    await render(true, true, 'next-route');
    expect(container.querySelector('output')?.dataset.routeReady).toBe('true');
    expect(container.querySelector('output')?.dataset.count).toBe('1');

    await render(false);
    expect(container.querySelector('output')?.dataset.count).toBe('0');
    await render(true);
    expect(container.querySelector('output')?.dataset.count).toBe('1');
    await render(false);
    expect(container.querySelector('output')?.dataset.count).toBe('0');
  });
});
