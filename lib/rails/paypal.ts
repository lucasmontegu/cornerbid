/**
 * PayPal Orders v2 rail — one-time purchase, hosted redirect.
 *
 * Same shape as Polar and Mercado Pago: create an order, send the buyer to PayPal,
 * fulfil on the webhook. Never on the return URL.
 *
 * PayPal differs from the other two rails in one way that matters: approving an order
 * does NOT move money. The flow is two webhooks:
 *
 *   CHECKOUT.ORDER.APPROVED   -> buyer approved; we capture server-side, return null
 *   PAYMENT.CAPTURE.COMPLETED -> money confirmed; this is the settlement
 *
 * Capturing from the webhook rather than the return URL means a buyer who closes the
 * tab after approving still gets charged and still gets their slot.
 *
 * Amounts are USD end to end — no conversion, unlike the Mercado Pago rail.
 *
 * Env:
 *   PAYPAL_CLIENT_ID      required
 *   PAYPAL_CLIENT_SECRET  required
 *   PAYPAL_WEBHOOK_ID     required — from the webhook you create in the dashboard
 *   PAYPAL_ENV            exactly 'live' or 'sandbox'. Anything else throws.
 *   NEXT_PUBLIC_APP_URL   required
 */
import type { CheckoutIntent, CreateIntentInput, PaymentRail, SettlementEvent } from './types';
import { RailVerificationError } from './types';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * Rejects anything that is not exactly 'live' or 'sandbox'.
 *
 * The earlier version treated every unrecognised value as sandbox. That turns a
 * one-character typo — 'production', 'Live', a stray quote — into live
 * credentials being posted to the sandbox host, whose only symptom is
 * `401 invalid_client`. That error points at the credentials, which are fine,
 * and says nothing about the variable that is actually wrong. Failing loudly
 * here costs one clear message instead of an afternoon.
 */
function apiBase(): string {
  const env = requireEnv('PAYPAL_ENV').trim().toLowerCase();
  if (env === 'live') return 'https://api-m.paypal.com';
  if (env === 'sandbox') return 'https://api-m.sandbox.paypal.com';
  throw new Error(`PAYPAL_ENV must be 'live' or 'sandbox'`);
}

/** True when the rail can create an order. Missing env must 503, never silently fall back. */
export function isPayPalConfigured(): boolean {
  // PAYPAL_ENV counts as configuration, not a detail: a wrong value picks the
  // wrong host, so it has to fail at this gate with the other missing vars
  // rather than deep inside order creation.
  const env = process.env.PAYPAL_ENV?.trim().toLowerCase();
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_WEBHOOK_ID &&
      process.env.NEXT_PUBLIC_APP_URL &&
      (env === 'live' || env === 'sandbox'),
  );
}

/** USD cents -> the 2-decimal string PayPal requires. 1234 -> "12.34". */
export function usdCentsToPayPalValue(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

/** "12.34" -> 1234. Rounds because floats lose cents. */
export function payPalValueToUsdCents(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

let token: { value: string; expiresAt: number } | undefined;

/** OAuth2 client-credentials token, cached until 60s before it expires. */
async function accessToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt) return token.value;

  const basic = Buffer.from(
    `${requireEnv('PAYPAL_CLIENT_ID')}:${requireEnv('PAYPAL_CLIENT_SECRET')}`,
  ).toString('base64');

  const response = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`PayPal token request failed with ${response.status}`);
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error('PayPal did not return an access token');

  token = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max(0, (body.expires_in ?? 3600) - 60) * 1000,
  };
  return token.value;
}

async function payPalFetch<T>(
  path: string,
  init: { method: string; body?: unknown; requestId?: string },
): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: init.method,
    headers: {
      authorization: `Bearer ${await accessToken()}`,
      'content-type': 'application/json',
      // Idempotency: a retried create or capture returns the original result
      // instead of charging the buyer twice.
      ...(init.requestId ? { 'paypal-request-id': init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`PayPal ${init.method} ${path} failed: ${response.status} ${detail}`);
    Object.assign(error, { statusCode: response.status });
    throw error;
  }

  return (await response.json()) as T;
}

interface PayPalLink {
  href?: string;
  rel?: string;
}

interface PayPalOrder {
  id?: string;
  status?: string;
  links?: PayPalLink[];
}

/**
 * `payer-action` is what an order created with an explicit `payment_source.paypal`
 * returns; `approve` is the older shape. Accept either so a PayPal-side change in
 * which one they emit does not break checkout.
 */
function approvalUrl(order: PayPalOrder): string | undefined {
  const links = order.links ?? [];
  const match =
    links.find((link) => link.rel === 'payer-action') ??
    links.find((link) => link.rel === 'approve');
  return match?.href;
}

export const payPalRail: PaymentRail = {
  name: 'paypal',

  async createIntent(input: CreateIntentInput): Promise<CheckoutIntent> {
    const appUrl = requireEnv('NEXT_PUBLIC_APP_URL').replace(/\/$/, '');
    const chargeCents = input.chargeAmountCents ?? input.quotedAmountCents;

    const order = await payPalFetch<PayPalOrder>('/v2/checkout/orders', {
      method: 'POST',
      requestId: input.bidId,
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: input.bidId,
            // The only metadata channel PayPal echoes back on the capture webhook.
            custom_id: input.bidId,
            description: `CornerBid — ${input.displayName}`.slice(0, 127),
            amount: {
              currency_code: 'USD',
              value: usdCentsToPayPalValue(chargeCents),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'CornerBid',
              shipping_preference: 'NO_SHIPPING',
              // "Pay Now" instead of "Continue" — there is no cart to review.
              user_action: 'PAY_NOW',
              return_url: `${appUrl}/success`,
              cancel_url: `${appUrl}/?canceled=1`,
            },
          },
        },
      },
    });

    const redirectUrl = approvalUrl(order);
    if (!order.id || !redirectUrl) {
      throw new Error('PayPal did not return an approval URL');
    }

    return { intentId: order.id, redirectUrl };
  },

  async verify(request: Request): Promise<SettlementEvent | null> {
    const raw = await request.text();
    const event = JSON.parse(raw || 'null') as {
      id?: string;
      event_type?: string;
      resource?: Record<string, unknown>;
    } | null;

    if (!event?.event_type) return null;

    // Verify before acting on anything in the payload.
    const verification = await payPalFetch<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: {
          auth_algo: request.headers.get('paypal-auth-algo'),
          cert_url: request.headers.get('paypal-cert-url'),
          transmission_id: request.headers.get('paypal-transmission-id'),
          transmission_sig: request.headers.get('paypal-transmission-sig'),
          transmission_time: request.headers.get('paypal-transmission-time'),
          webhook_id: requireEnv('PAYPAL_WEBHOOK_ID'),
          webhook_event: JSON.parse(raw),
        },
      },
    );

    if (verification.verification_status !== 'SUCCESS') {
      throw new RailVerificationError(
        `PayPal webhook ${event.id ?? '(no id)'} failed signature verification`,
      );
    }

    const resource = event.resource ?? {};

    // Approval is not money. Capture it, then wait for the capture webhook.
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = typeof resource.id === 'string' ? resource.id : undefined;
      if (orderId) {
        await payPalFetch(`/v2/checkout/orders/${orderId}/capture`, {
          method: 'POST',
          requestId: `capture:${orderId}`,
        }).catch((error: unknown) => {
          // ORDER_ALREADY_CAPTURED means a retry raced us. The capture webhook
          // still fires, so this is not a failure.
          const detail = error instanceof Error ? error.message : String(error);
          if (!/ORDER_ALREADY_CAPTURED/i.test(detail)) throw error;
        });
      }
      return null;
    }

    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return null;

    const bidId = typeof resource.custom_id === 'string' ? resource.custom_id : undefined;
    if (!bidId) {
      throw new RailVerificationError(
        `PayPal capture ${String(resource.id)} is missing custom_id`,
      );
    }

    const amount = resource.amount as { value?: string; currency_code?: string } | undefined;
    const amountCents = payPalValueToUsdCents(amount?.value ?? '0');
    if (amountCents <= 0) {
      throw new RailVerificationError(
        `PayPal capture ${String(resource.id)} has an unusable amount`,
      );
    }

    const captureId = String(resource.id ?? '');

    return {
      rail: 'paypal',
      // Keyed on the capture, not the delivery: a redelivered webhook carries a new
      // transmission id but the same capture, and must not settle twice.
      eventId: `capture.completed:${captureId}`,
      bidId,
      amountCents,
      currency: amount?.currency_code ?? 'USD',
      paymentId: captureId,
      raw: event,
    };
  },

  async settle(event: SettlementEvent, outcome: 'won' | 'lost'): Promise<void> {
    if (outcome === 'won') return; // Already captured.

    // No authorization hold on this flow, so unwinding is a real refund and the
    // buyer does see a charge followed by a reversal.
    await payPalFetch(`/v2/payments/captures/${event.paymentId}/refund`, {
      method: 'POST',
      requestId: `refund:${event.paymentId}`,
      body: {
        amount: {
          value: usdCentsToPayPalValue(event.amountCents),
          currency_code: event.currency || 'USD',
        },
      },
    });
  },
};
