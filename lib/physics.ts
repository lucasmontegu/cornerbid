/**
 * Deterministic bounce physics for the single CornerBid slot.
 *
 * Nothing here touches I/O or randomness. The server and every connected client
 * run these exact functions over the same stored parameters, so they all agree on
 * where the logo is and when it hits a corner — without syncing any position.
 *
 * See docs/plans/2026-08-21-cornerbid-design.md section 3 for the derivation.
 */

/** Logical coordinate space. The rendered viewport scales to fit this box. */
export const VIEWPORT = {
  width: 1600,
  height: 900,
  /**
   * The bouncing object is a SQUARE plate, not the raw logo.
   *
   * Logos arrive at wildly different aspect ratios — X avatars are square, og:images
   * are about 1.91:1. If the box matched the image, its size would change per holder
   * and every span, ratio and coprime pair would change with it.
   *
   * A fixed square with the logo contained inside solves that, and it is what makes
   * the corner land honestly: the plate's own corner is what touches the screen's
   * corner, so there is never a gap between what bounces and what you see.
   */
  logoWidth: 160,
  logoHeight: 160,
} as const;

/** Travel span per axis: the box minus the logo, i.e. the range of the top-left corner. */
export const SPAN_X = VIEWPORT.width - VIEWPORT.logoWidth; // 1440
export const SPAN_Y = VIEWPORT.height - VIEWPORT.logoHeight; // 740

/** Horizontal speed is fixed; the seed varies the vertical speed instead. */
export const SPEED_X = 240; // px/s

/** Seconds to cross the box horizontally. The unit that corner time is measured in. */
export const TRAVERSE_X = SPAN_X / SPEED_X; // 6s

/**
 * The pair of coprime integers that fully determines a trajectory.
 *
 * `q` sets when the corner happens: the first corner lands at exactly
 * `q * TRAVERSE_X` seconds. `p` sets the vertical speed needed to make the ratio
 * `TRAVERSE_X / traverseY` equal `p / q`.
 *
 * They must be coprime. If they share a factor the trajectory repeats early and
 * the corner arrives sooner than `q` implies.
 */
export interface PhysicsParams {
  readonly p: number;
  readonly q: number;
}

/** Corner must land in this window. Tunable: it is the retention knob. */
export const CORNER_WINDOW_SECONDS = { min: 300, max: 900 } as const; // 5–15 min

/** Vertical speed bounds. Outside these the motion stops reading as natural. */
export const SPEED_Y_RANGE = { min: 180, max: 320 } as const; // px/s

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** Vertical speed implied by a parameter pair, in px/s. */
export function speedY({ p, q }: PhysicsParams): number {
  return (SPAN_Y * p) / (TRAVERSE_X * q);
}

/** Seconds between consecutive corner hits — and until the first one. */
export function cornerPeriodSeconds({ q }: PhysicsParams): number {
  return q * TRAVERSE_X;
}

/** Elapsed seconds at which corner number `index` (1-based) occurs. */
export function cornerTimeAt(index: number, params: PhysicsParams): number {
  return index * cornerPeriodSeconds(params);
}

/**
 * Every (p, q) pair that satisfies the coprimality, corner-window and speed
 * constraints, ordered deterministically by (q, p).
 *
 * Built once at module load. Identical on server and client because it depends on
 * nothing but the constants above.
 */
export const PARAM_TABLE: readonly PhysicsParams[] = (() => {
  const table: PhysicsParams[] = [];
  const minQ = Math.ceil(CORNER_WINDOW_SECONDS.min / TRAVERSE_X);
  const maxQ = Math.floor(CORNER_WINDOW_SECONDS.max / TRAVERSE_X);

  for (let q = minQ; q <= maxQ; q++) {
    // speedY = SPAN_Y * p / (TRAVERSE_X * q), so bound p by the speed range.
    const minP = Math.ceil((SPEED_Y_RANGE.min * TRAVERSE_X * q) / SPAN_Y);
    const maxP = Math.floor((SPEED_Y_RANGE.max * TRAVERSE_X * q) / SPAN_Y);
    for (let p = minP; p <= maxP; p++) {
      if (gcd(p, q) === 1) table.push({ p, q });
    }
  }

  if (table.length === 0) {
    throw new Error(
      'PARAM_TABLE is empty: CORNER_WINDOW_SECONDS and SPEED_Y_RANGE do not intersect',
    );
  }
  return table;
})();

/**
 * Choose the trajectory for a holder.
 *
 * `seed` is derived from the winning bid id, so a given bid always produces the same
 * trajectory — reload the page, open a second browser, come back tomorrow: identical.
 *
 * Deliberately ignores what was paid. Paying more does not buy a sooner corner: the
 * wait is the product. See D7 in the design doc.
 */
export function pickParams(seed: bigint): PhysicsParams {
  const size = BigInt(PARAM_TABLE.length);
  const index = Number(((seed % size) + size) % size);
  return PARAM_TABLE[index]!;
}

/** Largest value Postgres `bigint` can hold. It is signed, not unsigned. */
export const MAX_SIGNED_BIGINT = (1n << 63n) - 1n;

/**
 * Derive a physics seed from a bid id (a uuid). FNV-1a over the raw string, which is
 * enough for spreading trajectories across the table — this is not security-sensitive,
 * the seed is public and the corner time is verifiable by anyone watching.
 *
 * Masked to 63 bits, not the usual 64. FNV-1a produces a uint64, but the `seed` column
 * is a Postgres `bigint`, which is *signed*: anything above 2^63-1 is rejected at
 * insert time. At 64 bits roughly half of all uuids would produce a seed that fails,
 * seemingly at random. Dropping the top bit keeps every seed insertable and costs
 * nothing — the value only ever indexes a table of a few thousand entries.
 */
export function seedFromBidId(bidId: string): bigint {
  const FNV_OFFSET = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;
  const MASK64 = (1n << 64n) - 1n;
  let hash = FNV_OFFSET;
  for (let i = 0; i < bidId.length; i++) {
    hash = ((hash ^ BigInt(bidId.charCodeAt(i))) * FNV_PRIME) & MASK64;
  }
  return hash & MAX_SIGNED_BIGINT;
}

/**
 * Triangular wave: a value travelling at constant speed, reflecting at 0 and `span`.
 */
function triangle(value: number, span: number): number {
  const period = span * 2;
  const wrapped = ((value % period) + period) % period;
  return wrapped <= span ? wrapped : period - wrapped;
}

/** Top-left position of the logo, in logical coordinates, at `elapsedSeconds`. */
export function positionAt(
  elapsedSeconds: number,
  params: PhysicsParams,
): { x: number; y: number } {
  return {
    x: triangle(SPEED_X * elapsedSeconds, SPAN_X),
    y: triangle(speedY(params) * elapsedSeconds, SPAN_Y),
  };
}

/**
 * How many corners have been hit by `elapsedSeconds`. The corner at t=0 is the
 * launch position and is never counted.
 *
 * Derived from time, not from position: comparing floating-point coordinates
 * against an edge would be at the mercy of rounding, while the corner times are
 * exact multiples of the period.
 */
export function cornerIndexAt(elapsedSeconds: number, params: PhysicsParams): number {
  if (elapsedSeconds <= 0) return 0;
  return Math.floor(elapsedSeconds / cornerPeriodSeconds(params));
}

/**
 * How many times the plate has bounced off any edge by `elapsedSeconds`.
 *
 * Deterministic like everything else here, which is what lets the colour be derived
 * from it: every viewer sees the plate turn the same colour at the same instant
 * without a byte crossing the network.
 */
export function bounceCountAt(elapsedSeconds: number, params: PhysicsParams): number {
  if (elapsedSeconds <= 0) return 0;
  const traverseY = (TRAVERSE_X * params.q) / params.p;
  return (
    Math.floor(elapsedSeconds / TRAVERSE_X) + Math.floor(elapsedSeconds / traverseY)
  );
}

/**
 * Plate colour, changing on every bounce like the original DVD screensaver.
 *
 * Hues advance by the golden angle so consecutive colours stay far apart and the
 * sequence takes a long time to visibly repeat.
 */
export function colorAt(elapsedSeconds: number, params: PhysicsParams): string {
  const GOLDEN_ANGLE = 137.508;
  const hue = (bounceCountAt(elapsedSeconds, params) * GOLDEN_ANGLE) % 360;
  return `hsl(${hue.toFixed(1)} 88% 62%)`;
}

/** Guard for values coming out of the database. */
export function assertValidParams(params: PhysicsParams): void {
  const { p, q } = params;
  if (!Number.isInteger(p) || !Number.isInteger(q) || p <= 0 || q <= 0) {
    throw new Error(`physics params must be positive integers, got p=${p} q=${q}`);
  }
  if (gcd(p, q) !== 1) {
    throw new Error(`physics params must be coprime, got p=${p} q=${q} (gcd ${gcd(p, q)})`);
  }
}
