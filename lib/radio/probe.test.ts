import { describe, expect, test } from 'bun:test';
import { extractLyricsEng } from './probeHelpers';

describe('extractLyricsEng', () => {
  test('returns trimmed text when lyrics-eng tag is present', () => {
    const tags: Record<string, unknown> = {
      'lyrics-eng': '  Some lyrics text  ',
    };
    expect(extractLyricsEng(tags)).toBe('Some lyrics text');
  });

  test('returns null when lyrics-eng tag is absent', () => {
    const tags: Record<string, unknown> = {
      artist: 'Someone',
      comment: 'A comment',
    };
    expect(extractLyricsEng(tags)).toBeNull();
  });

  test('returns null when lyrics-eng tag is whitespace-only', () => {
    const tags: Record<string, unknown> = {
      'lyrics-eng': '   \t\n   ',
    };
    expect(extractLyricsEng(tags)).toBeNull();
  });

  test('returns value when lyrics-eng contains [Instrumental]', () => {
    const tags: Record<string, unknown> = {
      'lyrics-eng': '[Instrumental]',
    };
    expect(extractLyricsEng(tags)).toBe('[Instrumental]');
  });

  test('returns trimmed value when lyrics-eng has leading/trailing whitespace', () => {
    const tags: Record<string, unknown> = {
      'lyrics-eng': '\n  hello world  \t',
    };
    expect(extractLyricsEng(tags)).toBe('hello world');
  });

  test('finds lyrics-eng key case-insensitively', () => {
    const tags: Record<string, unknown> = {
      'Lyrics-Eng': 'Found via case-insensitive',
    };
    expect(extractLyricsEng(tags)).toBe('Found via case-insensitive');
  });

  test('returns null for empty tags object', () => {
    const tags: Record<string, unknown> = {};
    expect(extractLyricsEng(tags)).toBeNull();
  });

  test('returns null when tags is null', () => {
    expect(extractLyricsEng(null)).toBeNull();
  });
});
