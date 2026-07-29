import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { AmbientCoverArt } from './AmbientCoverArt';

let testWindow: Window;
let container: HTMLDivElement;
let root: Root;

const originalGlobals = new Map<string, unknown>();

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
});
