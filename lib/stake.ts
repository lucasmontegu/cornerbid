/**
 * Highest total this identity has already settled or applied.
 * Unwound (refunded) bids do not count toward the raise delta.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export async function getCommittedCents(identityKey: string): Promise<number> {
  const rows = await db.execute(sql`
    SELECT COALESCE(MAX(b.quoted_amount_cents), 0) AS committed
    FROM bids b
    JOIN identities i ON i.id = b.identity_id
    WHERE i.identity_key = ${identityKey}
      AND b.status IN ('applied', 'settled')
  `);
  const row = rows.rows[0] as { committed: number | string } | undefined;
  return Number(row?.committed ?? 0);
}
