import { describe, expect, test } from 'bun:test';
import { clampBidCents, formatUsd, parseBidDollars } from './money';

describe('formatUsd', () => {
  test('formats whole dollars without cents', () => {
    expect(formatUsd(100)).toBe('$1');
    expect(formatUsd(24700)).toBe('$247');
  });

  test('keeps cents when they exist', () => {
    expect(formatUsd(248)).toBe('$2.48');
  });
});

describe('typed bid amount', () => {
  test('strips $, commas and spaces', () => {
    expect(parseBidDollars('$1,250')).toBe(1250);
    expect(parseBidDollars('  248  ')).toBe(248);
    expect(parseBidDollars('usd 12')).toBe(12);
  });

  test('rounds to whole dollars', () => {
    expect(parseBidDollars('10.4')).toBe(10);
    expect(parseBidDollars('10.6')).toBe(11);
  });

  test('empty or junk is null', () => {
    expect(parseBidDollars('')).toBeNull();
    expect(parseBidDollars('abc')).toBeNull();
  });

  test('floors at the listing minimum and has no ceiling', () => {
    expect(clampBidCents(1, 100)).toBe(100);
    expect(clampBidCents(0, 100)).toBe(100);
    expect(clampBidCents(248, 24_800)).toBe(24_800);
    expect(clampBidCents(300, 24_800)).toBe(30_000);
    expect(clampBidCents(9999, 100)).toBe(999_900);
  });
});
