/**
 * Highest running total this identity has already settled or applied.
 * Unwound (refunded) bids do not count toward the raise delta.
 *
 * `paid_amount_cents` is the running stake written at settlement; quoted is the
 * fallback for a bid that settled but has not yet been applied.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export async function getCommittedCents(
  identityKey: string,
  excludeBidId?: string,
): Promise<number> {
  const rows = await db.execute(sql`
    SELECT COALESCE(MAX(COALESCE(b.paid_amount_cents, b.quoted_amount_cents)), 0) AS committed
    FROM bids b
    JOIN identities i ON i.id = b.identity_id
    WHERE i.identity_key = ${identityKey}
      AND b.status IN ('applied', 'settled')
      ${excludeBidId ? sql`AND b.id <> ${excludeBidId}::uuid` : sql``}
  `);
  const row = rows.rows[0] as { committed: number | string } | undefined;
  return Number(row?.committed ?? 0);
}

export async function getCommittedCentsByIdentityId(
  identityId: string,
  excludeBidId?: string,
): Promise<number> {
  const rows = await db.execute(sql`
    SELECT COALESCE(MAX(COALESCE(b.paid_amount_cents, b.quoted_amount_cents)), 0) AS committed
    FROM bids b
    WHERE b.identity_id = ${identityId}::uuid
      AND b.status IN ('applied', 'settled')
      ${excludeBidId ? sql`AND b.id <> ${excludeBidId}::uuid` : sql``}
  `);
  const row = rows.rows[0] as { committed: number | string } | undefined;
  return Number(row?.committed ?? 0);
}
