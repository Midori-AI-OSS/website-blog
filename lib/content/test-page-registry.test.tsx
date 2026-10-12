import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import BlogTestIndexPage from '@/app/blog/test/page';
import LoreTestIndexPage from '@/app/lore/test/page';
import { blogTestPages } from '@/lib/blog/test-pages';
import {
  blogLanguageMarkupTestPost,
  blogRendererTestPost,
  blogTtsTestPost,
  loreMarkdownTestPost,
  lorePasswordGateTestPost,
  loreTtsTestPost,
} from '@/lib/content/test-posts';
import { loreTestPages } from '@/lib/lore/test-pages';

function registeredPaths(pages: { href: string }[]): string[] {
  return pages.map(({ href }) => new URL(href, 'https://example.test').pathname).sort();
}

function discoveredChildRoutes(directory: string, prefix: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(directory, entry.name, 'page.tsx')))
    .map((entry) => `${prefix}/${entry.name}`)
    .sort();
}

function assertIndexContainsEntries(
  markup: string,
  pages: { href: string; title: string; purpose: string }[],
) {
  for (const page of pages) {
    expect(markup).toContain(page.title);
    expect(markup).toContain(page.purpose);
    expect(markup).toContain(`href="${page.href.replaceAll('&', '&amp;')}"`);
  }
}

describe('content test page indexes', () => {
  test('blog index links to every registered test page with its purpose', () => {
    const markup = renderToStaticMarkup(<BlogTestIndexPage />);

    assertIndexContainsEntries(markup, blogTestPages);
  });

  test('lore index links to every registered test page with its purpose', () => {
    const markup = renderToStaticMarkup(<LoreTestIndexPage />);

    assertIndexContainsEntries(markup, loreTestPages);
  });

  test('each registry and its route files have matching entries in both directions', () => {
    const sharedRoute = '/transition-test';
    const actualBlogRoutes = [
      ...discoveredChildRoutes(join(process.cwd(), 'app/blog/test'), '/blog/test'),
      sharedRoute,
    ].sort();
    const actualLoreRoutes = [
      ...discoveredChildRoutes(join(process.cwd(), 'app/lore/test'), '/lore/test'),
      sharedRoute,
    ].sort();

    expect(registeredPaths(blogTestPages)).toEqual(actualBlogRoutes);
    expect(registeredPaths(loreTestPages)).toEqual(actualLoreRoutes);
    expect(existsSync(join(process.cwd(), 'app/transition-test/page.tsx'))).toBe(true);
  });

  test('the shared transition test keeps blog and lore return context from each index', () => {
    const blogTransition = blogTestPages.find((page) => page.href.startsWith('/transition-test'));
    const loreTransition = loreTestPages.find((page) => page.href.startsWith('/transition-test'));

    expect(blogTransition?.href).toBe('/transition-test?returnTo=%2Fblog%2Ftest%2Fmarkdown');
    expect(loreTransition?.href).toBe('/transition-test?returnTo=%2Flore%2Ftest%2Fmarkdown');
  });

  test('Blog fixtures never contain Lore-only brace tokens', () => {
    const blogFixtures = [blogRendererTestPost, blogLanguageMarkupTestPost, blogTtsTestPost];

    for (const post of blogFixtures) {
      expect(post.content).not.toContain('{{');
      expect(post.rawMarkdown).not.toContain('{{');
    }
  });

  test('password protection stays on the dedicated Lore password-gate fixture', () => {
    expect(loreMarkdownTestPost.metadata.password).toBeUndefined();
    expect(loreTtsTestPost.metadata.password).toBeUndefined();
    expect(lorePasswordGateTestPost.metadata.password).toBe('lore-test');
  });
});
