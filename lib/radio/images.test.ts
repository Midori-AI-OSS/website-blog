import { describe, expect, test } from 'bun:test';
import { appendTrackCacheKey, pickDeterministicImage } from './images';

describe('appendTrackCacheKey', () => {
  test('appends track cache key when URL has no query', () => {
    const result = appendTrackCacheKey('/radio/v1/art/image', 'lofi/Until I Find You.mp3');
    const parsed = new URL(`https://example.com${result}`);

    expect(parsed.pathname).toBe('/radio/v1/art/image');
    expect(parsed.searchParams.get('midoriai_track')).toBe('lofi/Until I Find You.mp3');
  });

  test('preserves existing query params', () => {
    const result = appendTrackCacheKey('/radio/v1/art/image?channel=all', 'lofi/track.mp3');
    const parsed = new URL(`https://example.com${result}`);

    expect(parsed.searchParams.get('channel')).toBe('all');
    expect(parsed.searchParams.get('midoriai_track')).toBe('lofi/track.mp3');
  });

  test('returns original URL when track id is empty', () => {
    const original = '/radio/v1/art/image?channel=all';
    expect(appendTrackCacheKey(original, '')).toBe(original);
    expect(appendTrackCacheKey(original, '   ')).toBe(original);
    expect(appendTrackCacheKey(original, null)).toBe(original);
    expect(appendTrackCacheKey(original, undefined)).toBe(original);
  });

  test('preserves hash fragments', () => {
    const result = appendTrackCacheKey('/radio/v1/art/image?channel=all#hero', 'lofi/song.mp3');
    const parsed = new URL(`https://example.com${result}`);

    expect(parsed.hash).toBe('#hero');
    expect(parsed.searchParams.get('channel')).toBe('all');
    expect(parsed.searchParams.get('midoriai_track')).toBe('lofi/song.mp3');
  });

  test('encodes and decodes special characters in track id', () => {
    const trackId = 'lofi/Track & Name?.mp3';
    const result = appendTrackCacheKey('/radio/v1/art/image?channel=all', trackId);
    const parsed = new URL(`https://example.com${result}`);

    expect(parsed.searchParams.get('midoriai_track')).toBe(trackId);
  });
});

describe('pickDeterministicImage', () => {
  test('returns the same image for the same identity key', () => {
    const images = ['/blog/a.png', '/blog/b.png', '/blog/c.png'];
    const first = pickDeterministicImage(images, 'same-track-id', '/blog/placeholder.png');
    const second = pickDeterministicImage(images, 'same-track-id', '/blog/placeholder.png');

    expect(first).toBe(second);
  });
});
