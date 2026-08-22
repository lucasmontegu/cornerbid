/**
 * The four numbers in the live strip.
 *
 * Deliberately NOT part of `/api/state`. That route is polled every 2s by every
 * connected viewer, so it is the hottest query in the system; bolting three
 * aggregations onto it would multiply their cost by the audience. These move far
 * more slowly than the logo does, so they get their own endpoint and cadence.
 */
import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { getDataFastVisitorsOnline } from '@/lib/datafast';

export interface LiveStats {
  /** DataFast realtime. Null when unavailable — render nothing, never a zero. */
  visitorsOnline: number | null;
  cornersToday: number;
  clicksToday: number;
  bidTodayCents: number;
}

export const EMPTY_LIVE_STATS: LiveStats = {
  visitorsOnline: null,
  cornersToday: 0,
  clicksToday: 0,
  bidTodayCents: 0,
};

/**
 * A rolling 24h window rather than a calendar day.
 *
 * A calendar day would reset the strip to zeros at a midnight the viewer does
 * not share — the site has no single timezone. A rolling window is always
 * populated and always means the same thing to everyone reading it.
 */
async function boardStats(): Promise<Omit<LiveStats, 'visitorsOnline'>> {
  try {
    const rows = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM corner_hits
           WHERE hit_at > now() - interval '24 hours') AS corners,
        (SELECT count(*)::int FROM identity_clicks
           WHERE clicked_at > now() - interval '24 hours') AS clicks,
        (SELECT coalesce(sum(charge_amount_cents), 0)::bigint FROM bids
           WHERE rail <> 'house'
             AND status IN ('settled', 'applied')
             AND coalesce(settled_at, applied_at) > now() - interval '24 hours') AS bid_cents
    `);

    const row = rows.rows[0] as Record<string, unknown> | undefined;
    return {
      cornersToday: Number(row?.corners ?? 0),
      clicksToday: Number(row?.clicks ?? 0),
      bidTodayCents: Number(row?.bid_cents ?? 0),
    };
  } catch {
    // The strip is decoration around the bid form. It must never be the reason
    // the page fails to render.
    return { cornersToday: 0, clicksToday: 0, bidTodayCents: 0 };
  }
}

export async function getLiveStats(): Promise<LiveStats> {
  const [board, visitorsOnline] = await Promise.all([
    boardStats(),
    getDataFastVisitorsOnline(),
  ]);
  return { ...board, visitorsOnline };
}
