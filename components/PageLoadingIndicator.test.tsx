import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

describe('page loading indicator', () => {
  test('announces loading state with a polite accessible status', async () => {
    const modulePath = './PageLoadingIndicator';
    const loadingModule = await import(modulePath).catch(() => null);

    expect(loadingModule).not.toBeNull();
    if (!loadingModule) return;

    const markup = renderToStaticMarkup(createElement(loadingModule.PageLoadingIndicator));

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('Loading page');
  });
});
