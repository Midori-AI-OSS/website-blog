import { describe, expect, test } from 'bun:test';
import { getRadioReconnectDelay } from './reconnect';

describe('radio reconnect delays', () => {
  test('ramps exponentially from 100ms and caps at 2 seconds', () => {
    const delays = Array.from({ length: 7 }, (_, attempt) => getRadioReconnectDelay(attempt));

    expect(delays).toEqual([100, 200, 400, 800, 1_600, 2_000, 2_000]);
  });
});
