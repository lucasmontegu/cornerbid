import { describe, expect, test } from 'bun:test';
import { CLOCK_SMOOTHING, correctedNow, sampleOffset, smoothOffset } from './clock';

describe('clock skew', () => {
  test('offset is server minus client', () => {
    expect(sampleOffset(1_000, 900)).toBe(100);
    expect(sampleOffset(1_000, 1_200)).toBe(-200);
  });

  test('first sample snaps, later samples ease', () => {
    expect(smoothOffset(null, 1000)).toBe(1000);
    const next = smoothOffset(1000, 0);
    expect(next).toBe(1000 * (1 - CLOCK_SMOOTHING));
  });

  test('corrected now applies the offset', () => {
    expect(correctedNow(5_000, 250)).toBe(5_250);
  });
});
