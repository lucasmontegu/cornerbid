import { sql } from 'drizzle-orm';

import { db } from '@/db';

/**
 * First commit / public launch. The footer counter is measured from here, so
 * moving it rewrites the site's own leaderboard row.
 */
export const LAUNCHED_AT = new Date(
  process.env.NEXT_PUBLIC_LAUNCHED_AT ?? '2026-08-21T14:47:53-03:00',
);

/** X handle shown in the footer attribution. */
export const AUTHOR_HANDLE = process.env.NEXT_PUBLIC_AUTHOR_HANDLE ?? 'luquibuild';

export interface HouseRow {
  /** Gross USD cents settled across every identity. */
  earnedCents: number;
  hoursSinceLaunch: number;
  daysSinceLaunch: number;
}

let cached: { value: HouseRow; at: number } | null = null;
const TTL_MS = 30_000;

function elapsed(earnedCents: number): HouseRow {
  const ms = Math.max(0, Date.now() - LAUNCHED_AT.getTime());
  return {
    earnedCents,
    hoursSinceLaunch: Math.floor(ms / 3_600_000),
    daysSinceLaunch: Math.floor(ms / 86_400_000),
  };
}

/**
 * Revenue for the footer's self-row. Reads the same running total the
 * leaderboard ranks on, so the house row can never disagree with the board.
 */
export async function getHouseRow(): Promise<HouseRow> {
  if (cached && Date.now() - cached.at < TTL_MS) return elapsed(cached.value.earnedCents);

  try {
    const rows = await db.execute(sql`
      SELECT COALESCE(SUM(paid_total_cents), 0)::bigint AS earned FROM identities
    `);
    const earned = Number((rows.rows[0] as { earned?: string | number } | undefined)?.earned ?? 0);
    const value = elapsed(Number.isFinite(earned) ? earned : 0);
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return elapsed(cached?.value.earnedCents ?? 0);
  }
}
