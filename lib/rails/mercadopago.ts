/**
 * Mercado Pago Checkout Pro rail (default worldwide).
 *
 * Hosted redirect via Preferences — the same shape as Polar. Not Checkout Bricks,
 * not the transparent Checkout API, not card tokenization in this app.
 *
 * Checkout Pro captures on approval, so a lost outbid is a refund (PaymentRefund),
 * not a cancelled authorization. `capture: false` belongs to Bricks / Checkout API.
 *
 * Amounts are quoted in USD cents and charged in ARS. The rate is frozen onto the
 * preference at create time.
 *
 * Env (skill `MP_ACCESS_TOKEN` + Checkout Pro):
 *   MP_ACCESS_TOKEN      required — private key from Tus integraciones
 *   MP_PUBLIC_KEY        unused for redirect; kept so credentials can live together
 *   MP_WEBHOOK_SECRET    required — webhook "Secret signature"
 *   MP_USD_ARS_RATE      required when this rail is selected
 */
import MercadoPagoConfig, { Payment, PaymentRefund, Preference } from 'mercadopago';
import { arsRateFromEnv, usdCentsToArs } from './ars';
import {
  isPaymentNotification,
  MercadoPagoSignatureError,
  paymentIdFromNotification,
  verifyMercadoPagoSignature,
} from './mercadopago-signature';
import type { CheckoutIntent, CreateIntentInput, PaymentRail, SettlementEvent } from './types';
import { RailVerificationError } from './types';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** True when Checkout Pro can create a preference. Missing env returns 503 for this rail only. */
export function isMercadoPagoConfigured(): boolean {
  const rate = Number(process.env.MP_USD_ARS_RATE);
  return Boolean(
    process.env.MP_ACCESS_TOKEN &&
      process.env.MP_WEBHOOK_SECRET &&
      process.env.MP_USD_ARS_RATE &&
      process.env.NEXT_PUBLIC_APP_URL &&
      Number.isFinite(rate) &&
      rate > 0,
  );
}

let client: MercadoPagoConfig | undefined;
function mp(): MercadoPagoConfig {
  client ??= new MercadoPagoConfig({
    accessToken: requireEnv('MP_ACCESS_TOKEN'),
    options: { timeout: 8_000 },
  });
  return client;
}

function metaString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

export const mercadoPagoRail: PaymentRail = {
  name: 'mercadopago',

  async createIntent(input: CreateIntentInput): Promise<CheckoutIntent> {
    const appUrl = requireEnv('NEXT_PUBLIC_APP_URL').replace(/\/$/, '');
    const chargeCents = input.chargeAmountCents ?? input.quotedAmountCents;
    const rate = arsRateFromEnv();
    const unitPrice = usdCentsToArs(chargeCents, rate);
    const token = requireEnv('MP_ACCESS_TOKEN');

    const preference = await new Preference(mp()).create({
      body: {
        items: [
          {
            id: input.bidId,
            title: `CornerBid — ${input.displayName}`,
            description: input.identityKey,
            quantity: 1,
            unit_price: unitPrice,
            currency_id: 'ARS',
          },
        ],
        payer: input.email ? { email: input.email } : undefined,
        // Card statement only (≤13 chars in AR). Checkout Pro header is the collector account.
        statement_descriptor: 'CORNERBID',
        external_reference: input.bidId,
        metadata: {
          bid_id: input.bidId,
          quoted_amount_cents: String(input.quotedAmountCents),
          charge_amount_cents: String(chargeCents),
          expected_version: String(input.expectedVersion),
          identity_key: input.identityKey,
          usd_ars_rate: String(rate),
        },
        notification_url: `${appUrl}/api/webhooks/mercadopago?source_news=webhooks`,
        back_urls: {
          success: `${appUrl}/success`,
          failure: `${appUrl}/?canceled=1`,
          pending: `${appUrl}/success`,
        },
        auto_return: 'approved',
        binary_mode: true,
      },
    });

    const sandbox = token.startsWith('TEST-');
    const redirectUrl = sandbox
      ? (preference.sandbox_init_point ?? preference.init_point)
      : preference.init_point;

    if (!preference.id || !redirectUrl) {
      throw new Error('Mercado Pago did not return a Checkout Pro URL');
    }

    return { intentId: preference.id, redirectUrl };
  },

  async verify(request: Request): Promise<SettlementEvent | null> {
    const url = new URL(request.url);
    const body = (await request.json().catch(() => null)) as {
      type?: string;
      topic?: string;
      action?: string;
      data?: { id?: string | number };
      id?: string | number;
    } | null;

    if (!isPaymentNotification(url, body)) return null;

    const dataId = paymentIdFromNotification(url, body);
    if (!dataId) return null;

    try {
      verifyMercadoPagoSignature({
        xSignature: request.headers.get('x-signature'),
        xRequestId: request.headers.get('x-request-id'),
        dataId,
        secret: requireEnv('MP_WEBHOOK_SECRET'),
        toleranceSeconds: 300,
      });
    } catch (error) {
      if (error instanceof MercadoPagoSignatureError) {
        throw new RailVerificationError(error.message);
      }
      throw error;
    }

    const payment = await new Payment(mp()).get({ id: dataId });
    if (payment.status !== 'approved') return null;

    const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
    const bidId =
      payment.external_reference ??
      metaString(metadata.bid_id) ??
      metaString(metadata.bidId);

    if (!bidId) {
      throw new RailVerificationError(`payment ${payment.id} is missing external_reference`);
    }

    const quotedRaw = metaString(metadata.quoted_amount_cents) ?? metaString(metadata.quotedAmountCents);
    const quotedAmountCents = quotedRaw ? Number.parseInt(quotedRaw, 10) : 0;
    const chargeRaw =
      metaString(metadata.charge_amount_cents) ?? metaString(metadata.chargeAmountCents);
    const chargeAmountCents = chargeRaw ? Number.parseInt(chargeRaw, 10) : 0;

    return {
      rail: 'mercadopago',
      eventId: `payment.approved:${payment.id}`,
      bidId,
      amountCents:
        Number.isFinite(chargeAmountCents) && chargeAmountCents > 0
          ? chargeAmountCents
          : quotedAmountCents,
      currency: payment.currency_id ?? 'ARS',
      paymentId: String(payment.id),
      raw: payment,
    };
  },

  async settle(event: SettlementEvent, outcome: 'won' | 'lost'): Promise<void> {
    if (outcome === 'won') return;
    await new PaymentRefund(mp()).create({ payment_id: event.paymentId });
  },
};
