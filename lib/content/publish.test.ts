import { describe, expect, test } from 'bun:test';

import { formatLongDate, getPortlandToday, getPublishState } from './publish';

describe('publish helpers', () => {
  test('computes the Portland date around midnight correctly', () => {
    expect(getPortlandToday('2026-04-10T06:59:00Z')).toBe('2026-04-09');
    expect(getPortlandToday('2026-04-10T07:01:00Z')).toBe('2026-04-10');
  });

  test('stays stable across the spring DST transition', () => {
    expect(getPortlandToday('2026-03-08T09:59:00Z')).toBe('2026-03-08');
    expect(getPortlandToday('2026-03-08T10:01:00Z')).toBe('2026-03-08');
  });

  test('treats future-dated posts as scheduled until their PT day begins', () => {
    expect(getPublishState('2026-04-13', '2026-04-10T19:00:00Z').isScheduled).toBe(true);
    expect(getPublishState('2026-04-13', '2026-04-13T07:01:00Z').isPublished).toBe(true);
  });

  test('formats long dates without timezone drift', () => {
    expect(formatLongDate('2026-04-13')).toBe('April 13, 2026');
  });
});
