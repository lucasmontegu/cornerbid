/**
 * Creates a bid and hands back a Mercado Pago Checkout Pro URL.
 *
 * Polar is not a live checkout path. Missing MP credentials return 503 — never
 * a silent Polar fallback.
 */
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { bids, identities } from '@/db/schema';
import { isBlockedIdentity } from '@/lib/blocklist';
import { parseIdentityInput, resolveIdentity } from '@/lib/identity';
import { seedFromBidId } from '@/lib/physics';
import { getQuote, MIN_PLACE_CENTS } from '@/lib/pricing';
import { isMercadoPagoConfigured, mercadoPagoRail } from '@/lib/rails/mercadopago';
import { isPayPalConfigured, payPalRail } from '@/lib/rails/paypal';
import { chargeDeltaCents, nextStakeCents } from '@/lib/raise';
import { getCommittedCents } from '@/lib/stake';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

const CheckoutRequest = z.object({
  input: z.string().min(1).max(300),
  email: z.email().optional(),
  expectedAmountCents: z.number().int().min(MIN_PLACE_CENTS).max(99_999_999_00),
  country: z.string().length(2).optional(),
  timeZone: z.string().max(80).optional(),
  /** Buyer's pick from the rail modal. Absent means Mercado Pago, the historic default. */
  rail: z.enum(['mercadopago', 'paypal']).optional(),
});

function httpStatusFromUnknown(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { statusCode?: unknown; status?: unknown };
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  if (typeof candidate.status === 'number') return candidate.status;
  return undefined;
}

function checkoutFailureResponse(error: unknown): Response {
  const detail = error instanceof Error ? error.message : String(error);
  console.error('[checkout]', detail);

  if (/PAYPAL_CLIENT_ID|PAYPAL_CLIENT_SECRET|PAYPAL_WEBHOOK_ID|PAYPAL_ENV/.test(detail)) {
    return Response.json(
      { error: 'paypal_credentials_missing', message: 'PayPal is not configured' },
      { status: 503 },
    );
  }

  if (/MP_ACCESS_TOKEN|MP_WEBHOOK_SECRET|MP_USD_ARS_RATE|NEXT_PUBLIC_APP_URL/.test(detail)) {
    return Response.json(
      {
        error: 'mp_credentials_missing',
        message: 'Faltan credenciales de Mercado Pago',
      },
      { status: 503 },
    );
  }

  if (/paid_total_cents|charge_amount_cents|column .* does not exist|Failed query/i.test(detail)) {
    return Response.json(
      { error: 'checkout_unavailable', message: 'Checkout is temporarily unavailable.' },
      { status: 503 },
    );
  }

  const httpStatus = httpStatusFromUnknown(error);
  if (httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500) {
    return Response.json(
      { error: 'payment_rejected', message: 'Could not start payment.' },
      { status: 422 },
    );
  }

  return Response.json({ error: 'Could not start checkout' }, { status: 503 });
}

export async function POST(request: Request): Promise<Response> {
  if (!rateLimit(`checkout:${clientIp(request)}`, 8, 60_000)) {
    return tooManyRequests();
  }

  const parsedBody = CheckoutRequest.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { input, email, expectedAmountCents, rail: requestedRail } = parsedBody.data;
  const receiptEmail = email ?? '';
  const selectedRail = requestedRail ?? 'mercadopago';

  const parsedIdentity = parseIdentityInput(input);
  if (!parsedIdentity) {
    return Response.json(
      { error: 'Use an X handle like @levelsio, or a domain like fiber.so' },
      { status: 400 },
    );
  }

  if (isBlockedIdentity(parsedIdentity)) {
    return Response.json({ error: 'That listing is not allowed.' }, { status: 422 });
  }

  // Each rail gates on its own env. A missing rail must 503 for that rail only —
  // never silently redirect the buyer to a provider they did not choose.
  if (selectedRail === 'paypal' && !isPayPalConfigured()) {
    return Response.json(
      { error: 'paypal_credentials_missing', message: 'PayPal is not configured' },
      { status: 503 },
    );
  }

  if (selectedRail === 'mercadopago' && !isMercadoPagoConfigured()) {
    return Response.json(
      {
        error: 'mp_credentials_missing',
        message: 'Faltan credenciales de Mercado Pago',
      },
      { status: 503 },
    );
  }

  try {
    const quote = await getQuote();

    const alreadyCommittedCents = await getCommittedCents(parsedIdentity.key);
    const quotedTotalCents = nextStakeCents(alreadyCommittedCents, expectedAmountCents);
    const chargeAmountCents = chargeDeltaCents(quotedTotalCents, alreadyCommittedCents);
    if (chargeAmountCents <= 0) {
      return Response.json(
        { error: 'raise_required', message: 'Raise the amount above what this listing already paid.' },
        { status: 409 },
      );
    }

    // Concurrent checkouts are allowed. Occupancy is decided at webhook time:
    // accrue this charge, then take the slot only if the running total is #1.
    const expectedVersion = quote.version;

    const resolved = await resolveIdentity(parsedIdentity);

    const [identity] = await db
      .insert(identities)
      .values({
        identityType: resolved.type,
        identityKey: resolved.key,
        sourceUrl: resolved.sourceUrl,
        displayName: resolved.displayName,
        description: resolved.description,
        imageUrl: resolved.imageUrl,
        email: receiptEmail,
        status: 'pending',
      })
      .onConflictDoUpdate({
        target: identities.identityKey,
        set: {
          displayName: resolved.displayName,
          description: resolved.description,
          imageUrl: resolved.imageUrl,
          sourceUrl: resolved.sourceUrl,
          ...(receiptEmail ? { email: receiptEmail } : {}),
        },
      })
      .returning();

    const identityId = identity!.id;
    const bidId = crypto.randomUUID();

    await db.insert(bids).values({
      id: bidId,
      identityId,
      quotedAmountCents: quotedTotalCents,
      chargeAmountCents,
      expectedVersion,
      seed: seedFromBidId(bidId),
      rail: selectedRail,
      status: 'created',
    });

    const rail = selectedRail === 'paypal' ? payPalRail : mercadoPagoRail;

    const intent = await rail.createIntent({
      bidId,
      quotedAmountCents: quotedTotalCents,
      chargeAmountCents,
      email: receiptEmail || undefined,
      displayName: resolved.displayName,
      identityKey: resolved.key,
      expectedVersion,
    });

    await db
      .update(bids)
      .set({ railIntentId: intent.intentId })
      .where(eq(bids.id, bidId));

    return Response.json({
      bidId,
      amountCents: quotedTotalCents,
      chargeAmountCents,
      rail: selectedRail,
      redirectUrl: intent.redirectUrl,
      identity: {
        displayName: resolved.displayName,
        imageUrl: resolved.imageUrl,
        key: resolved.key,
      },
    });
  } catch (error) {
    return checkoutFailureResponse(error);
  }
}
