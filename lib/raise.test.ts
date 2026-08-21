import { describe, expect, test } from 'bun:test';
import { chargeDeltaCents } from './raise';

describe('raise by paying the difference', () => {
  test('a new identity pays the full quote', () => {
    expect(chargeDeltaCents(24_800, 0)).toBe(24_800);
  });

  test('the same URL/@handle pays only the delta', () => {
    expect(chargeDeltaCents(24_800, 24_700)).toBe(100);
  });

  test('an amount already covered charges nothing', () => {
    expect(chargeDeltaCents(24_700, 24_700)).toBe(0);
  });
});
