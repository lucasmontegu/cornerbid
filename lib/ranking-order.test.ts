import { describe, expect, test } from 'bun:test';
import { sortRanking } from './ranking-order';

function entry(partial: { identityId: string; cornerCount: number; heldAt: Date; amountCents?: number }) {
  return {
    identityId: partial.identityId,
    cornerCount: partial.cornerCount,
    heldAt: partial.heldAt,
    amountCents: partial.amountCents ?? 0,
  };
}

describe('sortRanking', () => {
  test('orders by hits descending', () => {
    const ranked = sortRanking([
      entry({ identityId: 'a', cornerCount: 2, heldAt: new Date('2026-08-01') }),
      entry({ identityId: 'b', cornerCount: 9, heldAt: new Date('2026-08-02') }),
    ]);
    expect(ranked.map((row) => row.identityId)).toEqual(['b', 'a']);
  });

  test('tied hits go to whoever reached that count first', () => {
    const ranked = sortRanking([
      entry({ identityId: 'late', cornerCount: 5, heldAt: new Date('2026-08-10') }),
      entry({ identityId: 'early', cornerCount: 5, heldAt: new Date('2026-08-02') }),
    ]);
    expect(ranked.map((row) => row.identityId)).toEqual(['early', 'late']);
  });

  test('does not rank by bid amount', () => {
    const ranked = sortRanking([
      entry({ identityId: 'rich', cornerCount: 1, amountCents: 50_000, heldAt: new Date('2026-08-03') }),
      entry({ identityId: 'hits', cornerCount: 4, amountCents: 100, heldAt: new Date('2026-08-04') }),
    ]);
    expect(ranked[0]?.identityId).toBe('hits');
  });
});
