/**
 * Polar rail.
 *
 * The product must be configured as **Pay what you want** (`amountType: 'custom'`),
 * not Fixed price. The `amount` field on a checkout session only takes effect on a
 * custom price; against a fixed price the product's own amount is charged and the
 * whole pay-the-difference mechanic silently breaks.
 *
 * Set the product's `minimum_amount` to 100 ($1 floor). There is no product ceiling
 * in CornerBid; raise Polar's `maximum_amount` in the dashboard if a PWYW cap remains.
 */
import { Polar } from '@polar-sh/sdk';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import type {
  CheckoutIntent,
  CreateIntentInput,
  PaymentRail,
  SettlementEvent,
} from './types';
import { RailVerificationError } from './types';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let client: Polar | undefined;
function polar(): Polar {
  client ??= new Polar({
    accessToken: requireEnv('POLAR_ACCESS_TOKEN'),
    server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
  });
  return client;
}

export const polarRail: PaymentRail = {
  name: 'polar',

  async createIntent(input: CreateIntentInput): Promise<CheckoutIntent> {
    const appUrl = requireEnv('NEXT_PUBLIC_APP_URL');

    const checkout = await polar().checkouts.create({
      products: [requireEnv('POLAR_PRODUCT_ID')],
      // Only honoured because the product uses custom (pay-what-you-want) pricing.
      // Raise-by-difference charges the delta; metadata still carries the slot total.
      amount: input.chargeAmountCents ?? input.quotedAmountCents,
      customerEmail: input.email,
      successUrl: `${appUrl}/success?checkout_id={CHECKOUT_ID}`,
      metadata: {
        bid_id: input.bidId,
        quoted_amount_cents: String(input.quotedAmountCents),
        charge_amount_cents: String(input.chargeAmountCents ?? input.quotedAmountCents),
        expected_version: String(input.expectedVersion),
        identity_key: input.identityKey,
      },
    });

    return { intentId: checkout.id, redirectUrl: checkout.url };
  },

  async verify(request: Request): Promise<SettlementEvent | null> {
    const body = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let event;
    try {
      event = validateEvent(body, headers, requireEnv('POLAR_WEBHOOK_SECRET'));
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw new RailVerificationError('invalid Polar webhook signature');
      }
      throw error;
    }

    // order.paid is the only event that means money actually arrived. order.created
    // fires before payment is confirmed and must not drive fulfillment.
    if (event.type !== 'order.paid') return null;

    const order = event.data;
    const bidId = order.metadata?.bid_id;
    const quoted = order.metadata?.quoted_amount_cents;
    const charged = order.metadata?.charge_amount_cents;

    if (typeof bidId !== 'string' || typeof quoted !== 'string') {
      throw new RailVerificationError(
        `order ${order.id} is missing bid_id/quoted_amount_cents metadata`,
      );
    }

    const quotedAmountCents = Number.parseInt(quoted, 10);
    const chargeAmountCents = Number.parseInt(
      typeof charged === 'string' ? charged : quoted,
      10,
    );
    if (!Number.isFinite(quotedAmountCents) || quotedAmountCents <= 0) {
      throw new RailVerificationError(`order ${order.id} has an unusable quoted amount`);
    }

    if (order.totalAmount < chargeAmountCents) {
      throw new RailVerificationError(
        `order ${order.id} charged ${order.totalAmount} but claims a charge of ${chargeAmountCents}`,
      );
    }

    return {
      rail: 'polar',
      // Keyed on the order, not the delivery: a redelivered webhook carries a new
      // transport id but the same order, and must not settle twice.
      eventId: `order.paid:${order.id}`,
      bidId,
      amountCents: quotedAmountCents,
      currency: order.currency ?? 'usd',
      paymentId: order.id,
      raw: event,
    };
  },

  async settle(event: SettlementEvent, outcome: 'won' | 'lost'): Promise<void> {
    if (outcome === 'won') return; // Polar already captured at checkout.

    // Polar has no authorization hold, so unwinding a lost bid is a real refund and
    // the buyer does see a charge followed by a reversal.
    await polar().refunds.create({
      orderId: event.paymentId,
      reason: 'customer_request',
      amount: event.amountCents,
      revokeBenefits: true,
    });
  },
};
