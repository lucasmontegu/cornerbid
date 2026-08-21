/**
 * One interface, several payment providers.
 *
 * Everything downstream of a settlement — the reservation, the atomic takeover, the
 * physics reset — is rail-agnostic. Polar and Mercado Pago Checkout Pro both capture
 * on approval; a lost bid is refunded. Authorization holds (`capture: false`) would
 * require Bricks and are out of scope.
 */
import type { SettleableRail } from '@/db/schema';

export interface CheckoutIntent {
  /** Provider-side id, stored on the bid as `rail_intent_id`. */
  intentId: string;
  /** Where to send the buyer. */
  redirectUrl: string;
}

export interface CreateIntentInput {
  bidId: string;
  /** New slot total in USD cents — what takeover writes to game_state. */
  quotedAmountCents: number;
  /**
   * What to charge now. Returning brands pay the difference from what they have
   * already committed. Defaults to `quotedAmountCents`.
   */
  chargeAmountCents?: number;
  /** Optional — Polar and Mercado Pago collect email on the hosted checkout. */
  email?: string;
  displayName: string;
  identityKey: string;
  expectedVersion: number;
}

/**
 * A settlement, normalized across providers.
 *
 * `amountCents` is always the amount *we quoted*, never the provider's charged total,
 * which includes buyer-country tax and would make the leaderboard a ranking of VAT
 * rates rather than of bids.
 */
export interface SettlementEvent {
  rail: SettleableRail;
  /** Idempotency key. Unique per settled order, stable across webhook redeliveries. */
  eventId: string;
  bidId: string;
  amountCents: number;
  currency: string;
  /** Provider payment/order id, stored as `rail_payment_id`. */
  paymentId: string;
  raw: unknown;
}

export interface PaymentRail {
  readonly name: SettleableRail;

  createIntent(input: CreateIntentInput): Promise<CheckoutIntent>;

  /**
   * Verify signature and normalize. Returns null for events that are not a
   * settlement — those are acknowledged and ignored, not errors.
   */
  verify(request: Request): Promise<SettlementEvent | null>;

  /**
   * Called after the takeover resolves. `won` finalizes, `lost` unwinds: a refund on
   * Polar, a cancelled authorization on Mercado Pago.
   */
  settle(event: SettlementEvent, outcome: 'won' | 'lost'): Promise<void>;
}

export class RailVerificationError extends Error {}
