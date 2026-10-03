import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { preloadImage } from './images';

const originalWindow = globalThis.window;
const originalImage = globalThis.Image;
let testWindow: Window;
let images: ControlledImage[];
let synchronousLoad = false;

class ControlledImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  url = '';
  constructor() {
    images.push(this);
  }
  set src(url: string) {
    this.url = url;
    if (synchronousLoad && url) this.onload?.();
  }
}

beforeEach(() => {
  images = [];
  synchronousLoad = false;
  testWindow = new Window();
  globalThis.window = testWindow as unknown as typeof window;
  globalThis.Image = ControlledImage as unknown as typeof Image;
});
afterEach(async () => {
  await testWindow.happyDOM.abort();
  globalThis.window = originalWindow;
  globalThis.Image = originalImage;
});

describe('radio image preloading', () => {
  test('shares a pending image request for the same artwork URL', async () => {
    const first = preloadImage('/art/pending.png');
    const second = preloadImage('/art/pending.png');
    const count = images.length;
    for (const image of images) image.onload?.();
    expect(await Promise.all([first, second])).toEqual([true, true]);
    expect(count).toBe(1);
  });

  test('reuses successfully loaded artwork on subsequent calls', async () => {
    const first = preloadImage('/art/cached.png');
    images[0].onload?.();
    expect(await first).toBe(true);
    const second = preloadImage('/art/cached.png');
    const count = images.length;
    for (const image of images) image.onload?.();
    expect(await second).toBe(true);
    expect(count).toBe(1);
  });

  test('a failed load can be retried by a later artwork request', async () => {
    const first = preloadImage('/art/retry.png');
    images[0].onerror?.();
    expect(await first).toBe(false);
    const second = preloadImage('/art/retry.png');
    images[1].onload?.();
    expect(await second).toBe(true);
    expect(images.length).toBe(2);
  });

  test('cached images can complete synchronously without breaking timeout cleanup', async () => {
    synchronousLoad = true;
    expect(await preloadImage('/art/synchronous.png')).toBe(true);
  });

  test('timeout settles all consumers and ignores a late image event', async () => {
    const first = preloadImage('/art/timed-out.png', 5);
    const second = preloadImage('/art/timed-out.png', 5);
    const lateLoad = images[0].onload;
    expect(await Promise.all([first, second])).toEqual([false, false]);
    lateLoad?.();
    const retry = preloadImage('/art/timed-out.png');
    images.at(-1)?.onload?.();
    expect(await retry).toBe(true);
    expect(images.length).toBe(2);
  });

  test('evicts older successful images as newer artwork is loaded', async () => {
    synchronousLoad = true;
    for (let index = 0; index < 70; index++) {
      expect(await preloadImage(`/art/eviction-${index}.png`)).toBe(true);
    }
    const previous = images.length;
    expect(await preloadImage('/art/eviction-0.png')).toBe(true);
    expect(images.length).toBe(previous + 1);
    expect(await preloadImage('/art/eviction-69.png')).toBe(true);
    expect(images.length).toBe(previous + 1);
  });
});
