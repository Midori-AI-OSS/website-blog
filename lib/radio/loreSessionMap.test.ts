import { describe, expect, test } from 'bun:test';
import type { ParsedPost } from '@/lib/blog/parser';
import type { LoreMatchParams } from './loreSessionMap';
import {
  detectHighestSession,
  detectPovFromAliases,
  detectPovFromChannel,
  normalizeSessionNumber,
  resolveLoreMatch,
} from './loreSessionMap';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(overrides: Partial<ParsedPost> = {}): ParsedPost {
  return {
    metadata: {
      title: 'Test Title',
      summary: 'Test summary',
      tags: ['lore', 'real-moments', 'echo'],
      cover_image: '/lore/test.png',
      date: '2026-01-01',
      author: 'Luna Midori',
      game: 'real-moments',
      story_order: 1,
      episode_label: 'Test Arc',
      ...overrides.metadata,
    },
    content: '',
    rawMarkdown: '',
    filename: 'test-post.md',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeSessionNumber
// ---------------------------------------------------------------------------

describe('normalizeSessionNumber', () => {
  test('returns integer for valid positive numbers', () => {
    expect(normalizeSessionNumber(0)).toBe(0);
    expect(normalizeSessionNumber(1)).toBe(1);
    expect(normalizeSessionNumber(5)).toBe(5);
    expect(normalizeSessionNumber(42)).toBe(42);
  });

  test('returns integer for valid numeric strings', () => {
    expect(normalizeSessionNumber('0')).toBe(0);
    expect(normalizeSessionNumber('1')).toBe(1);
    expect(normalizeSessionNumber('5')).toBe(5);
  });

  test('truncates float values to integer', () => {
    expect(normalizeSessionNumber(3.7)).toBe(3);
    expect(normalizeSessionNumber('3.7')).toBe(3);
  });

  test('returns null for undefined', () => {
    expect(normalizeSessionNumber(undefined)).toBeNull();
  });

  test('returns null for null', () => {
    expect(normalizeSessionNumber(null)).toBeNull();
  });

  test('returns null for NaN', () => {
    expect(normalizeSessionNumber(NaN)).toBeNull();
  });

  test('returns null for Infinity', () => {
    expect(normalizeSessionNumber(Infinity)).toBeNull();
    expect(normalizeSessionNumber(-Infinity)).toBeNull();
  });

  test('returns null for negative numbers', () => {
    expect(normalizeSessionNumber(-1)).toBeNull();
    expect(normalizeSessionNumber(-5)).toBeNull();
  });

  test('returns null for non-numeric strings', () => {
    expect(normalizeSessionNumber('abc')).toBeNull();
    expect(normalizeSessionNumber('')).toBeNull();
  });

  test('returns null for boolean values', () => {
    expect(normalizeSessionNumber(true)).toBeNull();
    expect(normalizeSessionNumber(false)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectHighestSession
// ---------------------------------------------------------------------------

describe('detectHighestSession', () => {
  test('returns 0 for empty posts array', () => {
    expect(detectHighestSession([])).toBe(0);
  });

  test('returns 0 for posts with no determinable session', () => {
    const posts = [makePost({ filename: 'unknown-post.md' })];
    expect(detectHighestSession(posts)).toBe(0);
  });

  test('returns session from a known slug', () => {
    const posts = [makePost({ filename: 'echo-rumbodo.md' })]; // session 2
    expect(detectHighestSession(posts)).toBe(2);
  });

  test('returns highest session among multiple posts', () => {
    const posts = [
      makePost({ filename: 'riley-memoria-crystalli.md' }), // session 1
      makePost({ filename: 'echo-rumbodo.md' }), // session 2
      makePost({ filename: 'luna-nondum-per-stratum-lente.md' }), // session 5
    ];
    expect(detectHighestSession(posts)).toBe(5);
  });

  test('detects session 0 slug', () => {
    const posts = [makePost({ filename: 'luz-blessee-bar.md' })];
    expect(detectHighestSession(posts)).toBe(0);
  });

  test('detects session 4 subarc posts', () => {
    const posts = [
      makePost({ filename: 'echo-post-proelium.md' }),
      makePost({ filename: 'w-e-a-v-e-maneo-per-stratum-post-dies-lux.md' }),
    ];
    expect(detectHighestSession(posts)).toBe(4);
  });

  test('ignores non-real-moments posts', () => {
    const posts = [
      makePost({ filename: 'luna-dnd-cc-ab58-548a.md' }),
      makePost({ filename: 'weave-awakening.md' }),
    ];
    expect(detectHighestSession(posts)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// detectPovFromChannel
// ---------------------------------------------------------------------------

describe('detectPovFromChannel', () => {
  test('returns luna for lunar-mix', () => {
    expect(detectPovFromChannel('lunar-mix')).toBe('luna');
  });

  test('returns leo for leo-mix', () => {
    expect(detectPovFromChannel('leo-mix')).toBe('leo');
  });

  test('returns echo for echo-mix', () => {
    expect(detectPovFromChannel('echo-mix')).toBe('echo');
  });

  test('returns riley for riley-mix', () => {
    expect(detectPovFromChannel('riley-mix')).toBe('riley');
  });

  test('returns weave for weave-mix', () => {
    expect(detectPovFromChannel('weave-mix')).toBe('weave');
  });

  test('returns null for all channel', () => {
    expect(detectPovFromChannel('all')).toBeNull();
  });

  test('returns null for non-character channels', () => {
    expect(detectPovFromChannel('indie')).toBeNull();
    expect(detectPovFromChannel('instrumental')).toBeNull();
    expect(detectPovFromChannel('lofi')).toBeNull();
    expect(detectPovFromChannel('friends-music')).toBeNull();
    expect(detectPovFromChannel('bits-tech')).toBeNull();
    expect(detectPovFromChannel('recordatio')).toBeNull();
  });

  test('returns null for unknown channel', () => {
    expect(detectPovFromChannel('nonexistent')).toBeNull();
  });

  test('is case-insensitive', () => {
    expect(detectPovFromChannel('LUNAR-MIX')).toBe('luna');
    expect(detectPovFromChannel('Leo-Mix')).toBe('leo');
    expect(detectPovFromChannel('  lunar-mix  ')).toBe('luna');
  });
});

// ---------------------------------------------------------------------------
// detectPovFromAliases
// ---------------------------------------------------------------------------

describe('detectPovFromAliases', () => {
  test('returns null for empty array', () => {
    expect(detectPovFromAliases([])).toBeNull();
  });

  test('returns null when no aliases match', () => {
    expect(detectPovFromAliases(['completely unrelated text'])).toBeNull();
  });

  test('detects luna from exact alias', () => {
    expect(detectPovFromAliases(['luna'])).toBe('luna');
  });

  test('detects luna midori alias', () => {
    expect(detectPovFromAliases(['Luna Midori was here.'])).toBe('luna');
  });

  test('detects leo alias', () => {
    expect(detectPovFromAliases(['leo'])).toBe('leo');
  });

  test('detects leo midori alias', () => {
    expect(detectPovFromAliases(['Leo Midori said hello.'])).toBe('leo');
  });

  test('detects echo alias', () => {
    expect(detectPovFromAliases(['echo'])).toBe('echo');
  });

  test('detects riley alias', () => {
    expect(detectPovFromAliases(['riley'])).toBe('riley');
  });

  test('detects weave alias', () => {
    expect(detectPovFromAliases(['weave'])).toBe('weave');
  });

  test('detects w.e.a.v.e. alias', () => {
    expect(detectPovFromAliases(['W.E.A.V.E. System Log'])).toBe('weave');
  });

  test('detects alias mid-string', () => {
    expect(detectPovFromAliases(['The character luna smiled.'])).toBe('luna');
  });

  test('returns first match when multiple aliases present', () => {
    // luna is checked before leo in the map (insertion order), so detect luna first
    const result = detectPovFromAliases(['text with luna and leo']);
    expect(result).toBe('luna');
  });

  test('skips null entries', () => {
    expect(detectPovFromAliases([null, undefined, 'luna'])).toBe('luna');
  });

  test('returns null for texts with only empty strings', () => {
    expect(detectPovFromAliases(['', '   '])).toBeNull();
  });

  test('is case-insensitive', () => {
    expect(detectPovFromAliases(['ECHO'])).toBe('echo');
    expect(detectPovFromAliases(['LuNa MiDoRi'])).toBe('luna');
  });

  test('uses session 4 subarc alias map when session is 4', () => {
    // 'real riley' is only in the session 4 subarc alias map
    expect(detectPovFromAliases(['real riley'], 4)).toBe('riley');
  });

  test('detects w.e.a.v.e variant in session 4', () => {
    // 'w.e.a.v.e' (without trailing dot) is only in session 4 map
    expect(detectPovFromAliases(['w.e.a.v.e'], 4)).toBe('weave');
  });
});

// ---------------------------------------------------------------------------
// resolveLoreMatch
// ---------------------------------------------------------------------------

describe('resolveLoreMatch', () => {
  test('session 0 always returns luz-blessee-bar regardless of POV', () => {
    const posts = [
      makePost({
        filename: 'luz-blessee-bar.md',
        metadata: {
          title: 'Luz Blessee',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'riley'],
        },
      }),
    ];
    const params: LoreMatchParams = { session: 0, pov: 'luna', posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('luz-blessee-bar');
    expect(result?.href).toBe('/lore/luz-blessee-bar');
    expect(result?.game).toBe('real-moments');
  });

  test('session 0 works with null POV', () => {
    const posts = [
      makePost({
        filename: 'luz-blessee-bar.md',
        metadata: {
          title: 'Luz Blessee',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'riley'],
        },
      }),
    ];
    const params: LoreMatchParams = { session: 0, pov: null, posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('luz-blessee-bar');
  });

  test('session > 0 with known POV returns correct character post', () => {
    const posts = [
      makePost({
        filename: 'echo-rumbodo.md',
        metadata: {
          title: 'Echo Rumbodo',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'echo'],
        },
      }),
      makePost({
        filename: 'luna-rumbodo.md',
        metadata: {
          title: 'Luna Rumbodo',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'luna'],
        },
      }),
    ];
    const params: LoreMatchParams = { session: 2, pov: 'luna', posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('luna-rumbodo');
  });

  test('session > 0 with null POV returns first post alphabetically', () => {
    const posts = [
      makePost({
        filename: 'luna-rumbodo.md',
        metadata: {
          title: 'Luna Rumbodo',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'luna'],
        },
      }),
      makePost({
        filename: 'echo-rumbodo.md',
        metadata: {
          title: 'Echo Rumbodo',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'echo'],
        },
      }),
    ];
    const params: LoreMatchParams = { session: 2, pov: null, posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    // alphabetically: echo-rumbodo < luna-rumbodo
    expect(result?.slug).toBe('echo-rumbodo');
  });

  test('returns null for unknown session', () => {
    const posts = [makePost({ filename: 'echo-rumbodo.md' })];
    const params: LoreMatchParams = { session: 99, pov: 'echo', posts };
    expect(resolveLoreMatch(params)).toBeNull();
  });

  test('returns null when POV character has no post in session family', () => {
    const posts = [
      makePost({
        filename: 'echo-rumbodo.md',
        metadata: {
          title: 'Echo Rumbodo',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'echo'],
        },
      }),
    ];
    // Session 2 has echo, but we ask for 'riley' which is in the family but no post exists
    const params: LoreMatchParams = { session: 2, pov: 'riley', posts };
    expect(resolveLoreMatch(params)).toBeNull();
  });

  test('handles empty posts array', () => {
    const params: LoreMatchParams = { session: 3, pov: 'echo', posts: [] };
    expect(resolveLoreMatch(params)).toBeNull();
  });

  test('filters out non-real-moments posts', () => {
    const posts = [
      makePost({
        filename: 'luna-rumbodo.md',
        metadata: {
          title: 'Luna Rumbodo',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'luna'],
        },
      }),
      makePost({
        filename: 'fake-rumbodo.md',
        metadata: {
          title: 'Fake',
          game: 'celestial-covenant',
          tags: ['lore', 'celestial-covenant'],
        },
      }),
    ];
    const params: LoreMatchParams = { session: 2, pov: 'luna', posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('luna-rumbodo');
  });

  test('returns LoreMatchResult with correct fields', () => {
    const posts = [
      makePost({
        filename: 'echo-memoria-crystalli.md',
        metadata: {
          title: 'Memoria Crystalli: Echo',
          summary: 'Echo remembers.',
          tags: ['lore', 'real-moments', 'echo'],
          cover_image: '/lore/echo-memoria-crystalli.png',
          game: 'real-moments',
          episode_label: 'Memoria Crystalli',
        },
      }),
    ];
    const params: LoreMatchParams = { session: 1, pov: 'echo', posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('echo-memoria-crystalli');
    expect(result?.href).toBe('/lore/echo-memoria-crystalli');
    expect(result?.title).toBe('Memoria Crystalli: Echo');
    expect(result?.summary).toBe('Echo remembers.');
    expect(result?.coverImageUrl).toBe('/lore/echo-memoria-crystalli.png');
    expect(result?.tags).toEqual(['lore', 'real-moments', 'echo']);
    expect(result?.game).toBe('real-moments');
    expect(result?.episodeLabel).toBe('Memoria Crystalli');
  });

  test('falls back to empty string for missing episode_label', () => {
    const posts = [
      makePost({
        filename: 'echo-rumbodo.md',
        metadata: {
          title: 'Rumbodo Echo',
          summary: '',
          tags: ['lore', 'real-moments', 'echo'],
          game: 'real-moments',
          episode_label: undefined,
        },
      }),
    ];
    const params: LoreMatchParams = { session: 2, pov: 'echo', posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    expect(result?.episodeLabel).toBe('');
  });

  test('session 5 with known POV', () => {
    const posts = [
      makePost({
        filename: 'w-e-a-v-e-nondum-per-stratum-lente.md',
        metadata: {
          title: 'Weave NPSL',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'weave'],
        },
      }),
      makePost({
        filename: 'luna-nondum-per-stratum-lente.md',
        metadata: {
          title: 'Luna NPSL',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'luna'],
        },
      }),
    ];
    const params: LoreMatchParams = { session: 5, pov: 'weave', posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('w-e-a-v-e-nondum-per-stratum-lente');
  });

  test('POV matching is case-insensitive', () => {
    const posts = [
      makePost({
        filename: 'luna-rumbodo.md',
        metadata: {
          title: 'Luna Rumbodo',
          game: 'real-moments',
          tags: ['lore', 'real-moments', 'luna'],
        },
      }),
    ];
    const params: LoreMatchParams = { session: 2, pov: 'LUNA', posts };
    const result = resolveLoreMatch(params);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe('luna-rumbodo');
  });
});
