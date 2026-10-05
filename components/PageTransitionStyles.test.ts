import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

describe('shared page loading background', () => {
  test('covers the viewport opaquely while waiting without a separate animated background', () => {
    const testWindow = new Window();
    const style = testWindow.document.createElement('style');
    style.textContent = readFileSync(
      new URL('../app/page-transitions.css', import.meta.url),
      'utf8',
    );
    testWindow.document.head.append(style);
    const overlay = testWindow.document.createElement('div');
    overlay.className = 'page-transition-scrim page-transition-scrim--waiting';
    const status = testWindow.document.createElement('div');
    status.className = 'page-loading__status';
    overlay.append(status);
    testWindow.document.body.append(overlay);
    const overlayStyles = testWindow.getComputedStyle(overlay);
    const statusStyles = testWindow.getComputedStyle(status);
    expect(overlayStyles.position).toBe('fixed');
    expect(['#000', '#000000', 'rgb(0, 0, 0)']).toContain(overlayStyles.backgroundColor);
    expect(overlayStyles.opacity).toBe('1');
    expect(overlayStyles.transition).toBe('none');
    expect(Number(overlayStyles.zIndex)).toBeGreaterThan(1300);
    expect(['', 'none']).toContain(overlayStyles.animationName || '');
    expect(['', 'transparent', 'rgba(0, 0, 0, 0)']).toContain(statusStyles.backgroundColor);
    expect(statusStyles.borderRadius).not.toBe('999px');
    testWindow.happyDOM.abort();
  });
});
