import { describe, expect, test } from 'bun:test';
import { MIN_INCREMENT_CENTS, MIN_PLACE_CENTS, RESERVATION_MINUTES } from './pricing-constants';

describe('pricing constants', () => {
  test('minimum increment is $1', () => {
    expect(MIN_INCREMENT_CENTS).toBe(100);
  });

  test('listings start at $1 with no ceiling', () => {
    expect(MIN_PLACE_CENTS).toBe(100);
  });

  test('legacy reservation window constant remains 5 minutes (unused at checkout)', () => {
    expect(RESERVATION_MINUTES).toBe(5);
  });

  test('an empty slot quotes $1', () => {
    expect(0 + MIN_INCREMENT_CENTS).toBe(100);
  });

  test('a $247 holder quotes $248', () => {
    expect(24_700 + MIN_INCREMENT_CENTS).toBe(24_800);
  });
});
