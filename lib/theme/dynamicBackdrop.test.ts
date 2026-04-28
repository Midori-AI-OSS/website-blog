import { describe, expect, test } from 'bun:test';

import { resolveBackdropSource, toDarkMediumBackdropPalette } from './dynamicBackdrop';

describe('resolveBackdropSource', () => {
  test('prioritizes radio art while radio playback is active', () => {
    const source = resolveBackdropSource({
      radioPlaying: true,
      radioArtUrl: '/api/radio/art/current.png',
      postCoverUrl: '/api/blog-images/post-cover.png',
      placeholderUrl: '/blog/placeholder.png',
    });

    expect(source).toEqual({
      mode: 'radio',
      url: '/api/radio/art/current.png',
    });
  });

  test('falls back to placeholder for radio when art is missing', () => {
    const source = resolveBackdropSource({
      radioPlaying: true,
      radioArtUrl: '   ',
      postCoverUrl: '/api/blog-images/post-cover.png',
      placeholderUrl: '/blog/placeholder.png',
    });

    expect(source).toEqual({
      mode: 'radio',
      url: '/blog/placeholder.png',
    });
  });

  test('uses post cover when radio is idle', () => {
    const source = resolveBackdropSource({
      radioPlaying: false,
      radioArtUrl: null,
      postCoverUrl: '/api/blog-images/post-cover.png',
      placeholderUrl: '/blog/placeholder.png',
    });

    expect(source).toEqual({
      mode: 'post',
      url: '/api/blog-images/post-cover.png',
    });
  });

  test('uses placeholder when no normalized post cover exists', () => {
    const source = resolveBackdropSource({
      radioPlaying: false,
      radioArtUrl: null,
      postCoverUrl: '   ',
      placeholderUrl: '/blog/placeholder.png',
    });

    expect(source).toEqual({
      mode: 'placeholder',
      url: '/blog/placeholder.png',
    });
  });
});

describe('toDarkMediumBackdropPalette', () => {
  test('darkens each channel with the expected intensity', () => {
    const palette = toDarkMediumBackdropPalette({
      primary: '#808080',
      secondary: '#808080',
      tertiary: '#808080',
    });

    expect(palette).toEqual({
      primary: '#292929',
      secondary: '#242424',
      tertiary: '#2e2e2e',
    });
  });
});
