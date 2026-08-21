/**
 * Lifetime USD cents this identity has already paid.
 * Unwound (refunded) bids never increment paid_total_cents.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export async function getCommittedCents(identityKey: string): Promise<number> {
  const rows = await db.execute(sql`
    SELECT COALESCE(i.paid_total_cents, 0) AS committed
    FROM identities i
    WHERE i.identity_key = ${identityKey}
  `);
  const row = rows.rows[0] as { committed: number | string } | undefined;
  return Number(row?.committed ?? 0);
}

export async function getCommittedCentsByIdentityId(identityId: string): Promise<number> {
  const rows = await db.execute(sql`
    SELECT COALESCE(i.paid_total_cents, 0) AS committed
    FROM identities i
    WHERE i.id = ${identityId}::uuid
  `);
  const row = rows.rows[0] as { committed: number | string } | undefined;
  return Number(row?.committed ?? 0);
}
