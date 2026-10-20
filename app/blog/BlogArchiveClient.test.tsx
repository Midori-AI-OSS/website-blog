import { describe, expect, test } from 'bun:test';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageReadinessProvider } from '@/components/PageReadinessProvider';
import PageTransitionProvider from '@/components/PageTransitionProvider';
import type { ArchivePeriod } from '@/lib/blog/archive';
import { BlogArchiveClient } from './BlogArchiveClient';

describe('BlogArchiveClient initial rendering', () => {
  test('renders every period and its posts before any scroll or observer callback', () => {
    const periods: ArchivePeriod[] = Array.from({ length: 4 }, (_, index) => ({
      key: `2026-0${7 - index}`,
      label: `Archive month ${index}`,
      year: 2026,
      months: [7 - index],
      newestMonth: 7 - index,
      pickerLabel: `Month ${index}`,
      coverImageUrl: null,
      coverDimensions: { width: 1600, height: 900 },
      posts: [
        {
          filename: `2026-0${7 - index}-01.md`,
          metadata: { title: `Post in month ${index}` },
          content: '',
          rawMarkdown: '',
        },
      ],
    }));
    const router = {
      back() {},
      forward() {},
      refresh() {},
      hmrRefresh() {},
      push() {},
      replace() {},
      prefetch() {},
    };
    const html = renderToStaticMarkup(
      <AppRouterContext.Provider value={router}>
        <PageReadinessProvider>
          <PageTransitionProvider>
            <BlogArchiveClient periods={periods} />
          </PageTransitionProvider>
        </PageReadinessProvider>
      </AppRouterContext.Provider>,
    );
    for (let index = 0; index < periods.length; index++) {
      expect(html).toContain(`id="period-${periods[index]?.key}"`);
      expect(html).toContain(`Archive month ${index}`);
      expect(html).toContain(`Post in month ${index}`);
    }
    expect(html).not.toContain('data-lazy');
    expect(html).not.toContain('<img');
    expect(html.match(/data-cover-frame/g)).toHaveLength(4);
  });
});
