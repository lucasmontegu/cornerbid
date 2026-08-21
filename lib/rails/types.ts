/**
 * One interface, several payment providers.
 *
 * Everything downstream of a settlement — the atomic takeover, the
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
  /** New running total in USD cents — what takeover writes to game_state. */
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
 * `amountCents` is the identity's quoted running total (USD cents), never the
 * provider's charged total (tax, ARS conversion, or the raise delta). Takeover
 * still recomputes previous + this_charge so a webhook that only has the delta
 * cannot lose a same-identity raise.
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
