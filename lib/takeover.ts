/**
 * The takeover: the moment a paid bid replaces the logo on screen.
 *
 * Expressed as ONE statement with chained CTEs rather than a transaction. Two reasons:
 *
 *  1. `neon-http` has no interactive transactions (see db/index.ts).
 *  2. A single statement is atomic by definition and cannot be left half-open by a
 *     serverless invocation that gets frozen or killed mid-flight.
 *
 * Each paid order ADDS its charge onto identities.paid_total_cents. Occupancy then
 * compares that running total to game_state.current_amount_cents — #1 is whoever has
 * paid the most, even if two checkouts raced with a stale version token.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { cornerPeriodSeconds, pickParams, type PhysicsParams } from '@/lib/physics';

export interface TakeoverInput {
  bidId: string;
  identityId: string;
  /** USD cents charged on this order — added to the identity's running total. */
  chargeAmountCents: number;
  expectedVersion: number;
  seed: bigint;
}

export interface TakeoverResult {
  won: boolean;
  newVersion: number | null;
  previousIdentityId: string | null;
  paidTotalCents: number | null;
  params: PhysicsParams;
}

/**
 * Accrues the charge, then attempts occupancy if the new total beats the slot.
 * Returns `won: false` without occupying when someone else already paid more.
 */
export async function tryTakeover(input: TakeoverInput): Promise<TakeoverResult> {
  const params = pickParams(input.seed);
  const periodSeconds = cornerPeriodSeconds(params);
  const charge = Math.max(0, input.chargeAmountCents);

  const rows = await db.execute(sql`
    WITH prev AS (
      SELECT current_identity_id, physics_started_at
      FROM game_state
      WHERE id = 1
    ),
    accrued AS (
      UPDATE identities i SET
        paid_total_cents = i.paid_total_cents + ${charge}
      WHERE i.id = ${input.identityId}::uuid
        AND ${charge} > 0
        AND EXISTS (
          SELECT 1 FROM bids b
          WHERE b.id = ${input.bidId}::uuid
            AND b.status <> 'applied'
        )
      RETURNING i.id, i.paid_total_cents
    ),
    recorded AS (
      UPDATE bids b SET
        status            = 'applied',
        applied_at        = coalesce(b.applied_at, now()),
        paid_amount_cents = (SELECT paid_total_cents FROM accrued),
        charge_amount_cents = coalesce(b.charge_amount_cents, ${charge})
      WHERE b.id = ${input.bidId}::uuid
        AND EXISTS (SELECT 1 FROM accrued)
      RETURNING b.id
    ),
    claimed AS (
      UPDATE game_state g SET
        current_identity_id   = ${input.identityId}::uuid,
        current_bid_id        = ${input.bidId}::uuid,
        current_amount_cents  = (SELECT paid_total_cents FROM accrued),
        version               = g.version + 1,
        physics_started_at    = now(),
        phys_p                = ${params.p},
        phys_q                = ${params.q},
        next_corner_at        = now() + make_interval(secs => ${periodSeconds}),
        reserved_amount_cents = NULL,
        reserved_until        = NULL,
        updated_at            = now()
      WHERE g.id = 1
        AND EXISTS (SELECT 1 FROM accrued)
        AND (SELECT paid_total_cents FROM accrued) > g.current_amount_cents
      RETURNING g.version
    ),
    demoted AS (
      -- Skipped when the current holder is re-bidding to defend their own slot:
      -- demoting and promoting the same row in one statement is undefined.
      UPDATE identities SET
        status       = 'replaced',
        seconds_held = seconds_held
                     + GREATEST(0, EXTRACT(EPOCH FROM (now() - (SELECT physics_started_at FROM prev)))::int)
      WHERE id = (SELECT current_identity_id FROM prev)
        AND id <> ${input.identityId}::uuid
        AND EXISTS (SELECT 1 FROM claimed)
      RETURNING id
    ),
    promoted AS (
      UPDATE identities SET status = 'active'
      WHERE id = ${input.identityId}::uuid
        AND EXISTS (SELECT 1 FROM claimed)
      RETURNING id
    )
    SELECT
      (SELECT version FROM claimed)              AS new_version,
      (SELECT current_identity_id FROM prev)     AS previous_identity_id,
      (SELECT paid_total_cents FROM accrued)     AS paid_total_cents,
      (SELECT count(*) FROM recorded)            AS recorded_count,
      (SELECT count(*) FROM promoted)            AS promoted_count
  `);

  const row = (rows.rows[0] ?? {}) as {
    new_version: number | null;
    previous_identity_id: string | null;
    paid_total_cents: number | string | null;
  };

  return {
    won: row.new_version !== null,
    newVersion: row.new_version,
    previousIdentityId: row.previous_identity_id,
    paidTotalCents: row.paid_total_cents === null || row.paid_total_cents === undefined
      ? null
      : Number(row.paid_total_cents),
    params,
  };
}

/** Marks a bid that lost the race. The rail unwinds the money separately. */
export async function markBidUnwound(bidId: string): Promise<void> {
  await db.execute(sql`
    UPDATE bids SET status = 'unwound' WHERE id = ${bidId}::uuid AND status <> 'applied'
  `);
}

/**
 * Payment landed but did not take the screensaver. The listing still sits on the
 * board at the identity's running total — that is why the charge is not refunded.
 */
export async function placeBidOnBoard(identityId: string): Promise<void> {
  await db.execute(sql`
    UPDATE identities SET status = 'outbid'
    WHERE id = ${identityId}::uuid
      AND status NOT IN ('active', 'rejected')
  `);
}
