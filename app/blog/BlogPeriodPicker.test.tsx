import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { BlogPeriodPicker, getPeriodBreatheTiming } from './BlogPeriodPicker';

describe('BlogPeriodPicker', () => {
  test('uses deterministic breathing timings for the same period slug', () => {
    expect(getPeriodBreatheTiming('2026-07')).toEqual(getPeriodBreatheTiming('2026-07'));
    expect(getPeriodBreatheTiming('2026-07')).not.toEqual(getPeriodBreatheTiming('2026-06'));
  });

  test('renders each period selector as a real button', () => {
    const html = renderToStaticMarkup(
      <BlogPeriodPicker
        periods={[{ slug: '2026-07', title: 'Jul', coverUrl: '/blog/years/2026/jul.png' }]}
      />,
    );

    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
  });
});
