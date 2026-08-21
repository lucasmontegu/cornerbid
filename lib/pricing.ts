/**
 * What it costs to take the slot. Occupancy is not reserved at checkout —
 * concurrent sessions are allowed; the webhook takeover is the exclusive write.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { MIN_INCREMENT_CENTS } from '@/lib/pricing-constants';

export {
  MIN_INCREMENT_CENTS,
  MIN_PLACE_CENTS,
  RESERVATION_MINUTES,
} from '@/lib/pricing-constants';

export interface Quote {
  /** What the next bidder must pay, in cents. */
  amountCents: number;
  currentAmountCents: number;
  /** game_state.version this quote is bound to. */
  version: number;
}

export async function getQuote(): Promise<Quote> {
  const rows = await db.execute(sql`
    SELECT
      current_amount_cents,
      version
    FROM game_state WHERE id = 1
  `);
  const row = rows.rows[0] as {
    current_amount_cents: number;
    version: number;
  };

  return {
    amountCents: row.current_amount_cents + MIN_INCREMENT_CENTS,
    currentAmountCents: row.current_amount_cents,
    version: row.version,
  };
}
