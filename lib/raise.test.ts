import { describe, expect, test } from 'bun:test';
import { chargeDeltaCents, addChargeCents, nextStakeCents } from './raise';

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

describe('nextStakeCents — cumulative total per identity', () => {
  test('$10 then a $20 target stores $20 and charges $10', () => {
    const previous = 1_000;
    const target = 2_000;
    const stake = nextStakeCents(previous, target);
    expect(stake).toBe(2_000);
    expect(chargeDeltaCents(stake, previous)).toBe(1_000);
  });

  test('$10 then another $10 checkout adds to $20', () => {
    const previous = 1_000;
    const charge = 1_000;
    const stake = nextStakeCents(previous, charge);
    expect(stake).toBe(2_000);
    expect(chargeDeltaCents(stake, previous)).toBe(1_000);
  });

  test('webhook always adds the charge, never replaces the total', () => {
    expect(addChargeCents(0, 1_000)).toBe(1_000);
    expect(addChargeCents(1_000, 1_000)).toBe(2_000);
    expect(addChargeCents(1_000, 400)).toBe(1_400);
  });

  test('a charge equal to the occupant amount must still beat the slot', () => {
    const occupant = 1_000;
    expect(nextStakeCents(occupant, occupant)).toBeGreaterThan(occupant);
  });
});
