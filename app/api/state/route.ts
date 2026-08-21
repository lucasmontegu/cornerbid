/**
 * Live game snapshot. Polled every 2s. Cache-Control: no-store.
 *
 * Shape matches `app/api/state.types.ts` (the renderer Claude is building).
 * Also the only writer of corner_hits — persistence is lazy, driven by readers.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { GameSnapshot } from '@/app/api/state.types';
import { persistDueCorners } from '@/lib/corners';
import { cornerPeriodSeconds } from '@/lib/physics';
import { MIN_INCREMENT_CENTS } from '@/lib/pricing-constants';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(): Promise<Response> {
  await persistDueCorners();

  const result = await db.execute(sql`
    SELECT
      g.version,
      g.current_amount_cents,
      g.physics_started_at,
      g.phys_p,
      g.phys_q,
      g.current_identity_id,
      (g.reserved_until IS NOT NULL AND g.reserved_until > now()) AS is_reserved,
      GREATEST(
        g.current_amount_cents,
        CASE
          WHEN g.reserved_until IS NOT NULL AND g.reserved_until > now()
          THEN coalesce(g.reserved_amount_cents, 0)
          ELSE 0
        END
      ) AS quote_floor,
      i.identity_key,
      i.display_name,
      i.description,
      i.image_url,
      i.source_url,
      i.click_count,
      i.corner_count,
      (extract(epoch from now()) * 1000)::bigint AS server_now
    FROM game_state g
    JOIN identities i ON i.id = g.current_identity_id
    WHERE g.id = 1
  `);

  const row = result.rows[0] as
    | {
        version: number;
        current_amount_cents: number;
        physics_started_at: string | Date;
        phys_p: number;
        phys_q: number;
        current_identity_id: string;
        is_reserved: boolean;
        quote_floor: number;
        identity_key: string;
        display_name: string;
        description: string | null;
        image_url: string;
        source_url: string;
        click_count: number;
        corner_count: number;
        server_now: string | number;
      }
    | undefined;

  if (!row) {
    return Response.json({ error: 'unseeded' }, { status: 503, headers: NO_STORE });
  }

  const params = { p: Number(row.phys_p), q: Number(row.phys_q) };
  const started =
    row.physics_started_at instanceof Date
      ? row.physics_started_at.getTime()
      : new Date(row.physics_started_at).getTime();

  const payload: GameSnapshot = {
    version: Number(row.version),
    serverNow: Number(row.server_now),
    holder: {
      identityId: row.current_identity_id,
      identityKey: row.identity_key,
      displayName: row.display_name,
      imageUrl: row.image_url,
      sourceUrl: row.source_url,
      description: row.description,
      clickCount: Number(row.click_count ?? 0),
      cornerCount: Number(row.corner_count ?? 0),
    },
    physics: {
      ...params,
      startedAt: started,
      periodSeconds: cornerPeriodSeconds(params),
    },
    amountCents: Number(row.current_amount_cents),
    nextAmountCents: Number(row.quote_floor) + MIN_INCREMENT_CENTS,
    reserved: Boolean(row.is_reserved),
  };

  return Response.json(payload, { headers: NO_STORE });
}
