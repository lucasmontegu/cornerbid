/**
 * The numbers the front page renders: trending rate, ranking and live activity.
 *
 * Rank is lifetime (or season) corner hits — money only buys occupancy.
 * These are read on every page load, so they are plain SQL against indexed columns
 * rather than anything that needs a separate analytics service.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { seasonAt, type Season } from '@/lib/season';

export { sortRanking } from '@/lib/ranking-order';

export type RankingScope = 'all-time' | 'season';

export interface TrendingEntry {
  identityId: string;
  displayName: string;
  imageUrl: string;
  clicksPerHour: number;
}

export interface RankingEntry {
  identityId: string;
  displayName: string;
  description: string | null;
  imageUrl: string;
  sourceUrl: string;
  amountCents: number;
  clickCount: number;
  viewCount: number;
  cornerCount: number;
  isCurrentHolder: boolean;
  /** When this listing reached its current hit count. Tie-break: earlier wins. */
  heldAt: Date;
}

export interface ActivityEntry {
  displayName: string;
  imageUrl: string;
  amountCents: number;
  at: Date;
}

function mapRankingRow(r: Record<string, unknown>): RankingEntry {
  return {
    identityId: r.id as string,
    displayName: r.display_name as string,
    description: r.description as string | null,
    imageUrl: r.image_url as string,
    sourceUrl: r.source_url as string,
    amountCents: Number(r.amount_cents ?? 0),
    clickCount: Number(r.click_count ?? 0),
    viewCount: Number(r.view_count ?? 0),
    cornerCount: Number(r.corner_count ?? 0),
    isCurrentHolder: Boolean(r.is_current),
    heldAt: new Date(r.held_at as string),
  };
}

/**
 * Corner touches in the last hour. Occupancy time is what produces these.
 */
export async function getTrending(limit = 5): Promise<TrendingEntry[]> {
  const rows = await db.execute(sql`
    SELECT i.id, i.display_name, i.image_url, count(h.id)::int AS touches
    FROM corner_hits h
    JOIN identities i ON i.id = h.identity_id
    WHERE h.hit_at > now() - interval '1 hour'
      AND i.status <> 'rejected'
    GROUP BY i.id, i.display_name, i.image_url
    ORDER BY touches DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((r) => {
    const row = r as { id: string; display_name: string; image_url: string; touches: number };
    return {
      identityId: row.id,
      displayName: row.display_name,
      imageUrl: row.image_url,
      clicksPerHour: row.touches,
    };
  });
}

/** Rank by accumulated corner hits. #1 is whoever has the most, then who got there first. */
export async function getRanking(
  limit = 100,
  options?: { scope?: RankingScope; now?: Date },
): Promise<RankingEntry[]> {
  const scope = options?.scope ?? 'all-time';
  if (scope === 'season') {
    return getSeasonRanking(limit, seasonAt(options?.now));
  }
  return getAllTimeRanking(limit);
}

async function getAllTimeRanking(limit: number): Promise<RankingEntry[]> {
  const rows = await db.execute(sql`
    SELECT
      i.id, i.display_name, i.description, i.image_url, i.source_url,
      i.click_count, i.view_count, i.corner_count,
      i.paid_total_cents AS amount_cents,
      coalesce(
        (SELECT max(h.hit_at) FROM corner_hits h WHERE h.identity_id = i.id),
        max(coalesce(b.applied_at, b.settled_at, b.created_at))
      ) AS held_at,
      bool_or(b.id = g.current_bid_id) AS is_current
    FROM identities i
    JOIN bids b ON b.identity_id = i.id AND b.status IN ('applied', 'settled')
    CROSS JOIN game_state g
    WHERE i.status <> 'rejected' AND g.id = 1 AND b.rail <> 'house'
      AND i.paid_total_cents > 0
    GROUP BY i.id
    ORDER BY i.corner_count DESC, held_at ASC
    LIMIT ${limit}
  `);

  return rows.rows.map((r) => mapRankingRow(r as Record<string, unknown>));
}

async function getSeasonRanking(limit: number, season: Season): Promise<RankingEntry[]> {
  const rows = await db.execute(sql`
    SELECT
      i.id, i.display_name, i.description, i.image_url, i.source_url,
      i.click_count, i.view_count,
      coalesce(s.hits, 0)::int AS corner_count,
      i.paid_total_cents AS amount_cents,
      coalesce(s.reached_at, max(coalesce(b.applied_at, b.settled_at, b.created_at))) AS held_at,
      bool_or(b.id = g.current_bid_id) AS is_current
    FROM identities i
    JOIN bids b ON b.identity_id = i.id AND b.status IN ('applied', 'settled')
    CROSS JOIN game_state g
    LEFT JOIN (
      SELECT identity_id, count(*)::int AS hits, max(hit_at) AS reached_at
      FROM corner_hits
      WHERE hit_at >= ${season.start.toISOString()}::timestamptz
        AND hit_at < ${season.end.toISOString()}::timestamptz
      GROUP BY identity_id
    ) s ON s.identity_id = i.id
    WHERE i.status <> 'rejected' AND g.id = 1 AND b.rail <> 'house'
      AND (s.hits > 0 OR b.id = g.current_bid_id)
    GROUP BY i.id, s.hits, s.reached_at
    ORDER BY coalesce(s.hits, 0) DESC, held_at ASC
    LIMIT ${limit}
  `);

  return rows.rows.map((r) => mapRankingRow(r as Record<string, unknown>));
}

/** Recent takeovers, for the live ticker. */
export async function getRecentActivity(limit = 5): Promise<ActivityEntry[]> {
  const rows = await db.execute(sql`
    SELECT i.display_name, i.image_url, b.paid_amount_cents, b.applied_at
    FROM bids b
    JOIN identities i ON i.id = b.identity_id
    WHERE b.status = 'applied' AND b.applied_at IS NOT NULL AND b.rail <> 'house'
    ORDER BY b.applied_at DESC
    LIMIT ${limit}
  `);

  return rows.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      displayName: row.display_name as string,
      imageUrl: row.image_url as string,
      amountCents: Number(row.paid_amount_cents ?? 0),
      at: new Date(row.applied_at as string),
    };
  });
}
