/**
 * Lazy corner-hit persistence. Called from /api/state so a cron is never needed.
 *
 * Concurrency: unique (bid_id, corner_index) plus ON CONFLICT DO NOTHING.
 * Any number of viewers can race this and exactly one row is stored per hit.
 * Keyed by bid so a returning occupant keeps adding to their lifetime total.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { TRAVERSE_X } from '@/lib/physics';

export async function persistDueCorners(): Promise<number> {
  const result = await db.execute(sql`
    WITH g AS (
      SELECT
        current_identity_id,
        current_bid_id,
        physics_started_at,
        phys_q,
        next_corner_at,
        (phys_q * ${TRAVERSE_X})::double precision AS period_s,
        EXTRACT(EPOCH FROM (now() - physics_started_at))::double precision AS elapsed_s
      FROM game_state
      WHERE id = 1
    ),
    due AS (
      SELECT
        *,
        FLOOR(elapsed_s / period_s)::int AS latest_index
      FROM g
      WHERE current_identity_id IS NOT NULL
        AND current_bid_id IS NOT NULL
        AND next_corner_at <= now()
        AND elapsed_s > 0
        AND FLOOR(elapsed_s / period_s)::int >= 1
    ),
    inserted AS (
      INSERT INTO corner_hits (identity_id, bid_id, corner_index, hit_at)
      SELECT
        due.current_identity_id,
        due.current_bid_id,
        gs,
        due.physics_started_at + make_interval(secs => gs * due.period_s)
      FROM due
      CROSS JOIN LATERAL generate_series(1, due.latest_index) AS gs
      ON CONFLICT (bid_id, corner_index) DO NOTHING
      RETURNING identity_id
    ),
    bumped AS (
      UPDATE identities i
      SET corner_count = i.corner_count + inserted_count.n
      FROM (
        SELECT identity_id, count(*)::int AS n FROM inserted GROUP BY identity_id
      ) AS inserted_count
      WHERE i.id = inserted_count.identity_id
      RETURNING i.id
    ),
    advanced AS (
      UPDATE game_state gs
      SET
        next_corner_at = due.physics_started_at
          + make_interval(secs => (due.latest_index + 1) * due.period_s),
        updated_at = now()
      FROM due
      WHERE gs.id = 1
      RETURNING gs.id
    )
    SELECT coalesce((SELECT count(*) FROM inserted), 0)::int AS recorded
  `);

  const row = result.rows[0] as { recorded: number } | undefined;
  return row?.recorded ?? 0;
}
