/**
 * The numbers the front page renders: trending rate, ranking and live activity.
 *
 * These are read on every page load, so they are plain SQL against indexed columns
 * rather than anything that needs a separate analytics service.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';

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
  heldAt: Date;
}

export interface ActivityEntry {
  displayName: string;
  imageUrl: string;
  amountCents: number;
  at: Date;
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

/** Rank by cumulative bid (max applied/settled total), not by who currently holds the plaque. */
export async function getRanking(limit = 100): Promise<RankingEntry[]> {
  const rows = await db.execute(sql`
    SELECT
      i.id, i.display_name, i.description, i.image_url, i.source_url,
      i.click_count, i.view_count, i.corner_count,
      max(coalesce(b.paid_amount_cents, b.quoted_amount_cents)) AS amount_cents,
      max(coalesce(b.applied_at, b.settled_at, b.created_at)) AS held_at,
      bool_or(b.id = g.current_bid_id) AS is_current
    FROM identities i
    JOIN bids b ON b.identity_id = i.id AND b.status IN ('applied', 'settled')
    CROSS JOIN game_state g
    WHERE i.status <> 'rejected' AND g.id = 1 AND b.rail <> 'house'
    GROUP BY i.id
    ORDER BY amount_cents DESC, held_at ASC
    LIMIT ${limit}
  `);

  return rows.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      identityId: row.id as string,
      displayName: row.display_name as string,
      description: row.description as string | null,
      imageUrl: row.image_url as string,
      sourceUrl: row.source_url as string,
      amountCents: Number(row.amount_cents ?? 0),
      clickCount: Number(row.click_count ?? 0),
      viewCount: Number(row.view_count ?? 0),
      cornerCount: Number(row.corner_count ?? 0),
      isCurrentHolder: Boolean(row.is_current),
      heldAt: new Date(row.held_at as string),
    };
  });
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
