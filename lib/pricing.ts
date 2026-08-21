/**
 * What it costs to take the slot, and the short reservation that keeps two buyers
 * from paying for the same takeover.
 */
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { MIN_INCREMENT_CENTS, RESERVATION_MINUTES } from '@/lib/pricing-constants';

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
  /** True while someone else's checkout holds the slot. */
  reserved: boolean;
  reservedUntil: Date | null;
}

export async function getQuote(): Promise<Quote> {
  const rows = await db.execute(sql`
    SELECT
      current_amount_cents,
      version,
      reserved_amount_cents,
      reserved_until,
      (reserved_until IS NOT NULL AND reserved_until > now()) AS is_reserved
    FROM game_state WHERE id = 1
  `);
  const row = rows.rows[0] as {
    current_amount_cents: number;
    version: number;
    reserved_amount_cents: number | null;
    reserved_until: string | null;
    is_reserved: boolean;
  };

  // While a reservation is live the floor is the reserved amount, not the current
  // holder's — otherwise everyone would be quoted a price already spoken for.
  const floor = row.is_reserved
    ? Math.max(row.current_amount_cents, row.reserved_amount_cents ?? 0)
    : row.current_amount_cents;

  return {
    amountCents: floor + MIN_INCREMENT_CENTS,
    currentAmountCents: row.current_amount_cents,
    version: row.version,
    reserved: row.is_reserved,
    reservedUntil: row.reserved_until ? new Date(row.reserved_until) : null,
  };
}

/**
 * Claims the slot for `amountCents` for the next few minutes.
 *
 * Conditional UPDATE, no lock: zero rows means someone else got there first, which
 * the caller surfaces as "someone is bidding right now" rather than as an error.
 */
export async function reserveSlot(amountCents: number): Promise<{ version: number } | null> {
  const rows = await db.execute(sql`
    UPDATE game_state SET
      reserved_amount_cents = ${amountCents},
      reserved_until        = now() + make_interval(mins => ${RESERVATION_MINUTES}),
      updated_at            = now()
    WHERE id = 1
      AND (reserved_until IS NULL OR reserved_until < now())
      AND ${amountCents} > current_amount_cents
    RETURNING version
  `);
  const row = rows.rows[0] as { version: number } | undefined;
  return row ? { version: row.version } : null;
}

/** Frees the slot when a checkout is abandoned or fails. */
export async function releaseReservation(): Promise<void> {
  await db.execute(sql`
    UPDATE game_state
    SET reserved_amount_cents = NULL, reserved_until = NULL, updated_at = now()
    WHERE id = 1
  `);
}
