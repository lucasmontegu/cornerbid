import { describe, expect, test } from 'bun:test';
import {
  PARAM_TABLE,
  SPAN_X,
  SPAN_Y,
  SPEED_X,
  TRAVERSE_X,
  CORNER_WINDOW_SECONDS,
  SPEED_Y_RANGE,
  assertValidParams,
  bounceCountAt,
  colorAt,
  PLATE_PALETTE,
  cornerIndexAt,
  cornerPeriodSeconds,
  cornerTimeAt,
  MAX_SIGNED_BIGINT,
  pickParams,
  positionAt,
  seedFromBidId,
  speedY,
  type PhysicsParams,
} from './physics';

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** A deterministic spread across the table rather than the first N entries. */
function sampleTable(count: number): PhysicsParams[] {
  const step = Math.max(1, Math.floor(PARAM_TABLE.length / count));
  return PARAM_TABLE.filter((_, i) => i % step === 0).slice(0, count);
}

const EDGE_TOLERANCE = 1; // logical px, per the design's 1–2px allowance

describe('PARAM_TABLE', () => {
  test('is non-empty and every pair is coprime', () => {
    expect(PARAM_TABLE.length).toBeGreaterThan(0);
    for (const { p, q } of PARAM_TABLE) {
      expect(gcd(p, q)).toBe(1);
    }
  });

  test('every corner time falls inside the configured window', () => {
    for (const params of PARAM_TABLE) {
      const seconds = cornerPeriodSeconds(params);
      expect(seconds).toBeGreaterThanOrEqual(CORNER_WINDOW_SECONDS.min);
      expect(seconds).toBeLessThanOrEqual(CORNER_WINDOW_SECONDS.max);
    }
  });

  test('every vertical speed stays in the natural-motion range', () => {
    for (const params of PARAM_TABLE) {
      const vy = speedY(params);
      expect(vy).toBeGreaterThanOrEqual(SPEED_Y_RANGE.min);
      expect(vy).toBeLessThanOrEqual(SPEED_Y_RANGE.max);
    }
  });

  test('is ordered deterministically, so an index always means the same trajectory', () => {
    const sorted = [...PARAM_TABLE].sort((a, b) => a.q - b.q || a.p - b.p);
    expect(PARAM_TABLE).toEqual(sorted);
  });
});

describe('positionAt', () => {
  test('never leaves the box', () => {
    for (const params of sampleTable(40)) {
      for (let t = 0; t < 1200; t += 0.37) {
        const { x, y } = positionAt(t, params);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(SPAN_X);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(SPAN_Y);
      }
    }
  });

  test('launches from the top-left corner', () => {
    for (const params of sampleTable(10)) {
      expect(positionAt(0, params)).toEqual({ x: 0, y: 0 });
    }
  });

  test('is pure — same inputs, same output', () => {
    const params = PARAM_TABLE[123]!;
    expect(positionAt(41.5, params)).toEqual(positionAt(41.5, params));
  });
});

describe('the corner actually happens', () => {
  test('both axes sit on an edge at exactly q * TRAVERSE_X', () => {
    for (const params of sampleTable(60)) {
      const t = cornerPeriodSeconds(params);
      const { x, y } = positionAt(t, params);
      const onEdgeX = Math.min(x, SPAN_X - x);
      const onEdgeY = Math.min(y, SPAN_Y - y);
      expect(onEdgeX).toBeLessThanOrEqual(EDGE_TOLERANCE);
      expect(onEdgeY).toBeLessThanOrEqual(EDGE_TOLERANCE);
    }
  });

  test('and keeps happening every period', () => {
    for (const params of sampleTable(15)) {
      for (let n = 1; n <= 4; n++) {
        const { x, y } = positionAt(cornerTimeAt(n, params), params);
        expect(Math.min(x, SPAN_X - x)).toBeLessThanOrEqual(EDGE_TOLERANCE);
        expect(Math.min(y, SPAN_Y - y)).toBeLessThanOrEqual(EDGE_TOLERANCE);
      }
    }
  });
});

describe('the corner does not happen early', () => {
  /**
   * The trap this guards against: a (p, q) pair that is not actually coprime, or a
   * speed derivation that drifts, makes the logo hit a corner long before `q`
   * implies. The site would then look scripted and the whole hook dies.
   *
   * x touches an edge only at t = k * TRAVERSE_X. So it is enough to check that y
   * is off-edge at each of those times for k = 1 .. q-1. Checked exactly in
   * integers to keep floating point out of the assertion.
   */
  test('y is off-edge at every x-edge crossing before the first corner', () => {
    for (const { p, q } of sampleTable(50)) {
      for (let k = 1; k < q; k++) {
        // y is on an edge iff SPAN_Y * p * k / q is a multiple of SPAN_Y, i.e. q | p*k.
        expect((p * k) % q).not.toBe(0);
      }
    }
  });

  test('float positions agree: no early corner within tolerance', () => {
    for (const params of sampleTable(20)) {
      const period = cornerPeriodSeconds(params);
      for (let k = 1; k < params.q; k++) {
        const t = k * TRAVERSE_X;
        if (Math.abs(t - period) < 1e-9) continue;
        const { y } = positionAt(t, params);
        expect(Math.min(y, SPAN_Y - y)).toBeGreaterThan(EDGE_TOLERANCE);
      }
    }
  });
});

describe('cornerIndexAt', () => {
  test('counts nothing at or before launch', () => {
    const params = PARAM_TABLE[0]!;
    expect(cornerIndexAt(0, params)).toBe(0);
    expect(cornerIndexAt(-5, params)).toBe(0);
  });

  test('increments once per period and never skips', () => {
    const params = PARAM_TABLE[200]!;
    const period = cornerPeriodSeconds(params);
    expect(cornerIndexAt(period - 0.001, params)).toBe(0);
    expect(cornerIndexAt(period, params)).toBe(1);
    expect(cornerIndexAt(period * 2.5, params)).toBe(2);
    expect(cornerIndexAt(period * 9, params)).toBe(9);
  });
});

describe('assertValidParams', () => {
  test('accepts everything the table produced', () => {
    for (const params of sampleTable(100)) {
      expect(() => assertValidParams(params)).not.toThrow();
    }
  });

  test('rejects non-coprime pairs — the silent killer', () => {
    expect(() => assertValidParams({ p: 4, q: 80 })).toThrow(/coprime/);
  });

  test('rejects malformed values', () => {
    expect(() => assertValidParams({ p: 0, q: 80 })).toThrow(/positive integers/);
    expect(() => assertValidParams({ p: 1.5, q: 80 })).toThrow(/positive integers/);
  });
});

describe('the maths from the design doc', () => {
  /**
   * Pinned to literal spans rather than the current constants: this documents the
   * derivation itself, which must keep holding if the plate size is ever retuned.
   */
  test('with a 16:9 logo, q=80 p=143 gives vy ~241 px/s and a corner at 480s', () => {
    const spanX = 1440, spanY = 810, vx = 240;
    const traverseX = spanX / vx;
    const p = 143, q = 80;
    expect(gcd(p, q)).toBe(1);
    expect((spanY * p) / (traverseX * q)).toBeCloseTo(241.3, 1);
    expect(q * traverseX).toBe(480);
  });

  test('the naive vx = vy = 200 setup corners every 64.8s — the case to avoid', () => {
    const traverseX = 1440 / 200;
    const traverseY = 810 / 200;
    // Tx/Ty = 1440/810 reduces to 16/9, so p=16, q=9 and the corner lands at q * Tx
    expect(traverseX / traverseY).toBeCloseTo(16 / 9, 10);
    expect(9 * traverseX).toBeCloseTo(64.8, 10);
  });

  test('the current square plate still satisfies the same identity', () => {
    for (const params of sampleTable(20)) {
      // Tx / Ty must equal p / q exactly, or the corner never lands where q says.
      const traverseY = SPAN_Y / speedY(params);
      expect(TRAVERSE_X / traverseY).toBeCloseTo(params.p / params.q, 9);
    }
  });
});

describe('plate colour', () => {
  test('changes on bounces and is identical for identical inputs', () => {
    const params = PARAM_TABLE[42]!;
    expect(colorAt(120, params)).toBe(colorAt(120, params));
    expect(bounceCountAt(0, params)).toBe(0);
    expect(bounceCountAt(600, params)).toBeGreaterThan(bounceCountAt(60, params));
  });

  test('only ever emits a colour from the DVD palette', () => {
    for (const params of sampleTable(20)) {
      for (const t of [0, 7.3, 61, 480, 903]) {
        expect(PLATE_PALETTE).toContain(colorAt(t, params));
      }
    }
  });

  test('a bounce always moves the plate off its current colour', () => {
    const params = PARAM_TABLE[42]!;
    const traverseY = (TRAVERSE_X * params.q) / params.p;
    // Straddle the first horizontal bounce, which is one bounce and no more.
    expect(bounceCountAt(TRAVERSE_X + 0.01, params)).toBe(
      bounceCountAt(TRAVERSE_X - 0.01, params) + 1,
    );
    expect(colorAt(TRAVERSE_X + 0.01, params)).not.toBe(colorAt(TRAVERSE_X - 0.01, params));
    expect(traverseY).toBeGreaterThan(0);
  });
});

describe('pickParams', () => {
  test('is deterministic for a given seed', () => {
    const seed = seedFromBidId('9f1c2e44-0a7b-4d51-9c3e-77b2a5d1e808');
    expect(pickParams(seed)).toEqual(pickParams(seed));
  });

  test('always returns a valid pair from the table', () => {
    for (let i = 0; i < 500; i++) {
      const params = pickParams(seedFromBidId(`bid-${i}`));
      expect(PARAM_TABLE).toContainEqual(params);
      expect(() => assertValidParams(params)).not.toThrow();
    }
  });

  test('spreads trajectories across the corner-time window', () => {
    const times = new Set<number>();
    for (let i = 0; i < 400; i++) {
      times.add(cornerPeriodSeconds(pickParams(seedFromBidId(`bid-${i}`))));
    }
    // a degenerate hash would collapse everything onto a handful of values
    expect(times.size).toBeGreaterThan(50);
  });

  test('does not depend on the amount paid — waiting cannot be bought', () => {
    expect(pickParams.length).toBe(1);
  });

  test('handles seeds larger than the table without going out of bounds', () => {
    expect(() => pickParams(2n ** 64n - 1n)).not.toThrow();
    expect(PARAM_TABLE).toContainEqual(pickParams(2n ** 64n - 1n));
  });
});

describe('seedFromBidId', () => {
  /**
   * Regression: FNV-1a is a uint64, but the `seed` column is a Postgres bigint, which
   * is signed. At 64 bits roughly half of all uuids produced a seed above 2^63-1 and
   * the insert failed with "out of range for type bigint" — meaning about half of all
   * paid bids would have failed, apparently at random.
   */
  test('always fits in a signed 64-bit column', () => {
    for (let i = 0; i < 5000; i++) {
      const seed = seedFromBidId(crypto.randomUUID());
      expect(seed).toBeGreaterThanOrEqual(0n);
      expect(seed).toBeLessThanOrEqual(MAX_SIGNED_BIGINT);
    }
  });

  test('is deterministic', () => {
    const id = 'e3b0c442-98fc-1c14-9afb-f4c8996fb924';
    expect(seedFromBidId(id)).toBe(seedFromBidId(id));
  });

  test('different ids give different seeds', () => {
    const seeds = new Set<bigint>();
    for (let i = 0; i < 1000; i++) seeds.add(seedFromBidId(`bid-${i}`));
    expect(seeds.size).toBe(1000);
  });
});
