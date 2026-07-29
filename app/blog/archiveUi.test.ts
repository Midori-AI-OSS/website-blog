import { describe, expect, test } from 'bun:test';

import { getVisiblePageNumbers, parseStoredPageSize, serializePageSize } from './archiveUi';

describe('archiveUi helpers', () => {
  test('serializes and restores the All page size option', () => {
    expect(serializePageSize(Infinity)).toBe('all');
    expect(parseStoredPageSize('all')).toBe(Infinity);
  });

  test('restores numeric page sizes and rejects invalid values', () => {
    expect(parseStoredPageSize('20')).toBe(20);
    expect(parseStoredPageSize('Infinity')).toBeNull();
    expect(parseStoredPageSize('0')).toBeNull();
    expect(parseStoredPageSize('nope')).toBeNull();
  });

  test('returns every page when total pages fit in the visible window', () => {
    expect(getVisiblePageNumbers(4, 2)).toEqual([1, 2, 3, 4]);
  });

  test('centers the visible page window around the current page when possible', () => {
    expect(getVisiblePageNumbers(12, 6)).toEqual([4, 5, 6, 7, 8]);
  });

  test('pins the visible page window to the start or end near the boundaries', () => {
    expect(getVisiblePageNumbers(12, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(getVisiblePageNumbers(12, 12)).toEqual([8, 9, 10, 11, 12]);
  });
});
