import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageReadinessProvider } from './PageReadinessProvider';

describe('page loading indicator', () => {
  test('registers a busy fallback without rendering a duplicate loading announcement', async () => {
    const modulePath = './PageLoadingIndicator';
    const loadingModule = await import(modulePath).catch(() => null);

    expect(loadingModule).not.toBeNull();
    if (!loadingModule) return;

    const markup = renderToStaticMarkup(
      createElement(PageReadinessProvider, null, createElement(loadingModule.PageLoadingIndicator)),
    );

    expect(markup).not.toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain('Loading page');
  });
});
