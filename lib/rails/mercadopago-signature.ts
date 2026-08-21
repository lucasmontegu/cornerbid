/**
 * Checkout Pro webhook authentication.
 *
 * Mercado Pago signs notifications with HMAC-SHA256 over a manifest of
 * `data.id`, `x-request-id` and `ts`. The JSON body itself is unsigned — never
 * trust amounts or status from it; only use it (or the query string) to learn
 * which payment id to fetch from the API.
 *
 * Algorithm matches the official Node SDK `WebhookSignatureValidator`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export class MercadoPagoSignatureError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Invalid Mercado Pago webhook signature: ${reason}`);
    this.name = 'MercadoPagoSignatureError';
    this.reason = reason;
  }
}

export interface SignatureInputs {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
  /** Replay window. Omit to skip the clock check. */
  toleranceSeconds?: number;
  now?: () => number;
}

function parseSignatureHeader(header: string): { ts?: string; hashes: Record<string, string> } {
  const hashes: Record<string, string> = {};
  let ts: string | undefined;

  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (!key || !value) continue;
    if (key === 'ts') ts = value;
    else if (/^v\d+$/.test(key)) hashes[key] = value;
  }

  return { ts, hashes };
}

function buildManifest(dataId: string | null, requestId: string | null, ts: string): string {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  parts.push(`ts:${ts}`);
  return `${parts.join(';')};`;
}

/**
 * Throws {@link MercadoPagoSignatureError} when the notification is not authentic.
 */
export function verifyMercadoPagoSignature(input: SignatureInputs): void {
  const xSignature = input.xSignature?.trim() || null;
  const xRequestId = input.xRequestId?.trim() || null;
  const dataId = input.dataId?.trim() || null;

  if (!xSignature) throw new MercadoPagoSignatureError('missing x-signature');

  const { ts, hashes } = parseSignatureHeader(xSignature);
  if (!ts) throw new MercadoPagoSignatureError('missing timestamp');
  if (!/^\d+$/.test(ts)) throw new MercadoPagoSignatureError('malformed timestamp');
  if (!hashes.v1) throw new MercadoPagoSignatureError('missing v1 hash');

  const manifest = buildManifest(dataId, xRequestId, ts);
  const computed = createHmac('sha256', input.secret).update(manifest).digest('hex');

  const left = Buffer.from(computed);
  const right = Buffer.from(hashes.v1);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new MercadoPagoSignatureError('mismatch');
  }

  if (input.toleranceSeconds !== undefined) {
    const now = input.now ?? Date.now;
    const drift = Math.abs(now() - Number(ts) * 1000) / 1000;
    if (drift > input.toleranceSeconds) {
      throw new MercadoPagoSignatureError('timestamp out of tolerance');
    }
  }
}

/** Pulls the payment id out of Checkout Pro / IPN query params and JSON bodies. */
export function paymentIdFromNotification(
  url: URL,
  body: { type?: string; topic?: string; action?: string; data?: { id?: string | number }; id?: string | number } | null,
): string | null {
  const fromQuery =
    url.searchParams.get('data.id') ??
    (url.searchParams.get('type') === 'payment' || url.searchParams.get('topic') === 'payment'
      ? url.searchParams.get('id')
      : null);

  const fromBody = body?.data?.id ?? (body?.type === 'payment' || body?.topic === 'payment' ? body.id : undefined);

  const raw = fromQuery ?? (fromBody !== undefined ? String(fromBody) : null);
  return raw && raw.length > 0 ? raw : null;
}

export function isPaymentNotification(
  url: URL,
  body: { type?: string; topic?: string; action?: string } | null,
): boolean {
  const topic = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? body?.type ?? body?.topic;
  if (topic === 'payment') return true;
  return typeof body?.action === 'string' && body.action.startsWith('payment.');
}
