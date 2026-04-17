import { describe, expect, test } from 'bun:test';

import { buildStreamUrl } from './client';

describe('buildStreamUrl', () => {
  test('builds a stream URL with normalized channel and quality', () => {
    const url = new URL(
      buildStreamUrl({
        channel: '  ALL ',
        quality: 'HIGH',
      })
    );

    expect(url.pathname).toBe('/radio/v1/stream');
    expect(url.searchParams.get('channel')).toBe('all');
    expect(url.searchParams.get('q')).toBe('high');
  });

  test('supports a custom stream path and cache-busting token', () => {
    const url = new URL(
      buildStreamUrl({
        channel: 'lofi',
        quality: 'medium',
        baseUrl: 'http://localhost:3000',
        path: '/api/radio/stream',
        cacheBust: true,
      })
    );

    expect(url.origin).toBe('http://localhost:3000');
    expect(url.pathname).toBe('/api/radio/stream');
    expect(url.searchParams.get('channel')).toBe('lofi');
    expect(url.searchParams.get('q')).toBe('medium');
    expect(url.searchParams.get('ts')).toBeTruthy();
  });

  test('produces a fresh cache-busting token for each reconnect URL', () => {
    const first = new URL(
      buildStreamUrl({
        channel: 'all',
        quality: 'medium',
        cacheBust: true,
      })
    );
    const second = new URL(
      buildStreamUrl({
        channel: 'all',
        quality: 'medium',
        cacheBust: true,
      })
    );

    expect(first.searchParams.get('ts')).toBeTruthy();
    expect(second.searchParams.get('ts')).toBeTruthy();
    expect(first.searchParams.get('ts')).not.toBe(second.searchParams.get('ts'));
  });
});
