import { describe, expect, test } from 'bun:test';
import { getInternalPageTransitionHref } from '../lib/pageTransitions';

describe('page transition destinations', () => {
  test('returns a same-origin route with its query and hash', () => {
    expect(
      getInternalPageTransitionHref('/transition-test?source=home#ready', 'https://blog.example/'),
    ).toBe('/transition-test?source=home#ready');
  });

  test('ignores external, same-page, and non-http destinations', () => {
    expect(
      getInternalPageTransitionHref('https://other.example/blog', 'https://blog.example/'),
    ).toBeNull();
    expect(getInternalPageTransitionHref('/blog?sort=new', 'https://blog.example/blog')).toBeNull();
    expect(
      getInternalPageTransitionHref('mailto:team@example.com', 'https://blog.example/'),
    ).toBeNull();
  });
});
