import { describe, expect, test } from 'bun:test';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  test('allows up to max then denies until the window would reset', () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 2, 60_000)).toBe(true);
    expect(rateLimit(key, 2, 60_000)).toBe(true);
    expect(rateLimit(key, 2, 60_000)).toBe(false);
  });
});
