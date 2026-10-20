import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { AmbientCoverArt } from './AmbientCoverArt';
import { BlogCard } from './BlogCard';

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;

const originalGlobals = new Map<string, unknown>();
const observers: TestObserver[] = [];
const requestedImages: string[] = [];

class TestObserver {
  target: Element | null = null;
  disconnected = false;
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    observers.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
  disconnect() {
    this.disconnected = true;
  }
  intersect() {
    this.callback(
      [{ target: this.target, isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
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
    IntersectionObserver: TestObserver,
    Image: class {
      set src(url: string) {
        requestedImages.push(url);
      }
    },
    SyntaxError,
    getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    IS_REACT_ACT_ENVIRONMENT: true,
  };

  for (const [key, value] of Object.entries(assignments)) {
    originalGlobals.set(key, (globalThis as Record<string, unknown>)[key]);
    (globalThis as Record<string, unknown>)[key] = value;
  }

  (testWindow as Window & { SyntaxError?: typeof SyntaxError }).SyntaxError = SyntaxError;
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

describe('AmbientCoverArt', () => {
  beforeEach(() => {
    observers.length = 0;
    requestedImages.length = 0;
    installDom();
    container = document.createElement('div');
    document.body.appendChild(container);
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

  test('reports each failed image URL only once even with both image layers mounted', async () => {
    const errors: string[] = [];

    await act(async () => {
      root.render(
        <AmbientCoverArt
          coverImageUrl="/blog/years/2027/jul.png"
          alt="Archive cover"
          onImageError={(url) => errors.push(url)}
        />,
      );
      await flushEffects();
    });

    const initialImages = [...container.querySelectorAll('img')];
    expect(initialImages).toHaveLength(2);

    await act(async () => {
      initialImages[0]?.dispatchEvent(new testWindow.Event('error'));
      initialImages[1]?.dispatchEvent(new testWindow.Event('error'));
      await flushEffects();
    });

    expect(errors).toEqual(['/blog/years/2027/jul.png']);

    await act(async () => {
      root.render(
        <AmbientCoverArt
          coverImageUrl="/blog/years/2026/jul.png"
          alt="Archive cover"
          onImageError={(url) => errors.push(url)}
        />,
      );
      await flushEffects();
    });

    const rerenderedImages = [...container.querySelectorAll('img')];
    await act(async () => {
      rerenderedImages[0]?.dispatchEvent(new testWindow.Event('error'));
      await flushEffects();
    });

    expect(errors).toEqual(['/blog/years/2027/jul.png', '/blog/years/2026/jul.png']);
  });

  test.each([
    { width: 1600, height: 900 },
    { width: 900, height: 1600 },
  ])('reserves %j cover dimensions before either image layer loads', async (intrinsicSize) => {
    await act(async () => {
      root.render(
        <AmbientCoverArt
          deferArtwork
          intrinsicSize={intrinsicSize}
          coverImageUrl="/blog/deferred-cover.png"
          alt="Deferred archive cover"
        />,
      );
      await flushEffects();
    });
    expect(container.querySelectorAll('img')).toHaveLength(0);
    const frame = container.querySelector('[data-cover-frame]');
    expect(frame).not.toBeNull();
    const observer = observers[0];
    expect(observer?.options?.rootMargin).toBe('400px 0px');

    await act(async () => {
      observer?.intersect();
      await flushEffects();
    });
    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(container.querySelector('[data-cover-frame]')).toBe(frame);
    expect(observer?.disconnected).toBe(true);

    await act(async () => {
      root.render(
        <AmbientCoverArt
          deferArtwork
          intrinsicSize={intrinsicSize}
          coverImageUrl="/blog/placeholder.png"
          alt="Deferred archive cover"
        />,
      );
      await flushEffects();
    });
    expect(container.querySelector('[data-cover-frame]')).toBe(frame);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/blog/placeholder.png');
  });

  test('defers card backgrounds, validation, and palette extraction until near the viewport', async () => {
    const post = {
      filename: '2026-05-07.md',
      metadata: { title: 'Deferred card', cover_image: '/blog/deferred-card.png' },
      content: '',
      rawMarkdown: '',
    };
    await act(async () => {
      root.render(<BlogCard post={post} deferArtwork />);
      await flushEffects();
    });
    expect(container.querySelector('[role="article"]')?.textContent).toContain('Deferred card');
    expect(requestedImages).toHaveLength(0);
    expect(container.querySelector('div[aria-hidden]') === null).toBe(true);
    const observer = observers[0];

    await act(async () => {
      observer?.intersect();
      await flushEffects();
    });
    expect(container.querySelector('div[aria-hidden]') !== null).toBe(true);
    expect(requestedImages).toEqual([
      '/api/blog-images/deferred-card.png',
      '/api/blog-images/deferred-card.png',
    ]);
    expect(observer?.disconnected).toBe(true);

    await act(async () => {
      observer?.intersect();
      await flushEffects();
    });
    expect(requestedImages).toHaveLength(2);
  });
});
