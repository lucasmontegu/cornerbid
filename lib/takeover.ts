/**
 * The takeover: the moment a paid bid replaces the logo on screen.
 *
 * Expressed as ONE statement with chained CTEs rather than a transaction. Two reasons:
 *
 *  1. `neon-http` has no interactive transactions (see db/index.ts).
 *  2. A single statement is atomic by definition and cannot be left half-open by a
 *     serverless invocation that gets frozen or killed mid-flight.
 *
 * The first CTE is a conditional UPDATE guarded by the optimistic-concurrency version.
 * Every later CTE is gated on `EXISTS (SELECT 1 FROM claimed)`, so if the guard fails
 * nothing else runs. Postgres evaluates all of them against the same snapshot, which
 * is what lets `prev` observe the pre-update holder.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { cornerPeriodSeconds, pickParams, type PhysicsParams } from '@/lib/physics';

export interface TakeoverInput {
  bidId: string;
  identityId: string;
  /** Running total for this identity, not the increment charged on this order. */
  paidAmountCents: number;
  expectedVersion: number;
  seed: bigint;
}

export interface TakeoverResult {
  won: boolean;
  newVersion: number | null;
  previousIdentityId: string | null;
  params: PhysicsParams;
}

/**
 * Attempts the takeover. Returns `won: false` without side effects when the slot
 * moved on — the caller then unwinds the payment through the rail.
 */
export async function tryTakeover(input: TakeoverInput): Promise<TakeoverResult> {
  const params = pickParams(input.seed);
  const periodSeconds = cornerPeriodSeconds(params);

  const rows = await db.execute(sql`
    WITH prev AS (
      SELECT current_identity_id, physics_started_at
      FROM game_state
      WHERE id = 1
    ),
    claimed AS (
      UPDATE game_state g SET
        current_identity_id   = ${input.identityId}::uuid,
        current_bid_id        = ${input.bidId}::uuid,
        current_amount_cents  = ${input.paidAmountCents},
        version               = g.version + 1,
        physics_started_at    = now(),
        phys_p                = ${params.p},
        phys_q                = ${params.q},
        next_corner_at        = now() + make_interval(secs => ${periodSeconds}),
        reserved_amount_cents = NULL,
        reserved_until        = NULL,
        updated_at            = now()
      WHERE g.id = 1
        AND g.version = ${input.expectedVersion}
        AND ${input.paidAmountCents} > g.current_amount_cents
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
    ),
    settled AS (
      UPDATE bids SET
        status            = 'applied',
        applied_at        = now(),
        paid_amount_cents = ${input.paidAmountCents}
      WHERE id = ${input.bidId}::uuid
        AND EXISTS (SELECT 1 FROM claimed)
      RETURNING id
    )
    SELECT
      (SELECT version FROM claimed)              AS new_version,
      (SELECT current_identity_id FROM prev)     AS previous_identity_id,
      (SELECT count(*) FROM promoted)            AS promoted_count,
      (SELECT count(*) FROM settled)             AS settled_count
  `);

  const row = (rows.rows[0] ?? {}) as {
    new_version: number | null;
    previous_identity_id: string | null;
  };

  return {
    won: row.new_version !== null,
    newVersion: row.new_version,
    previousIdentityId: row.previous_identity_id,
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
 * board at this amount — that is why the charge is not refunded.
 */
export async function placeBidOnBoard(
  bidId: string,
  identityId: string,
  paidAmountCents: number,
): Promise<void> {
  await db.execute(sql`
    WITH placed AS (
      UPDATE bids SET
        status = 'applied',
        applied_at = coalesce(applied_at, now()),
        paid_amount_cents = ${paidAmountCents}
      WHERE id = ${bidId}::uuid
        AND status <> 'applied'
      RETURNING id
    )
    UPDATE identities SET status = 'outbid'
    WHERE id = ${identityId}::uuid
      AND status NOT IN ('active', 'rejected')
      AND EXISTS (SELECT 1 FROM placed)
  `);
}
