import { describe, expect, test } from 'bun:test';
import { createNavigationItems } from './NavBar';

describe('primary navigation radio gating', () => {
  test('uses three mobile columns while radio is checking or offline', () => {
    expect(createNavigationItems(false)).toHaveLength(3);
    expect(createNavigationItems(false).some((item) => item.path === '/radio')).toBe(false);
  });

  test('uses four columns only after radio is online', () => {
    const items = createNavigationItems(true);
    expect(items).toHaveLength(4);
    expect(items.at(-1)?.path).toBe('/radio');
  });
});
