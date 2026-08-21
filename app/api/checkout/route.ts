/**
 * Creates a bid and hands back a hosted checkout URL.
 *
 * Polar is the default worldwide. Mercado Pago Checkout Pro is used when the
 * bidder explicitly chose it (Argentina offer or the manual escape).
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
import { polarRail } from '@/lib/rails/polar';
import { isArgentinaHint, resolveCheckoutRail, type PreferredRail } from '@/lib/rails/select';
import type { PaymentRail } from '@/lib/rails/types';
import { chargeDeltaCents, nextStakeCents } from '@/lib/raise';
import { getCommittedCents } from '@/lib/stake';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

const CheckoutRequest = z.object({
  input: z.string().min(1).max(300),
  email: z.email().optional(),
  expectedAmountCents: z.number().int().min(MIN_PLACE_CENTS).max(99_999_999_00),
  country: z.string().length(2).optional(),
  timeZone: z.string().max(80).optional(),
  rail: z.enum(['polar', 'mercadopago']).optional(),
});

function railByName(name: ReturnType<typeof resolveCheckoutRail>): PaymentRail {
  return name === 'mercadopago' ? mercadoPagoRail : polarRail;
}

export async function POST(request: Request): Promise<Response> {
  if (!rateLimit(`checkout:${clientIp(request)}`, 8, 60_000)) {
    return tooManyRequests();
  }

  const parsedBody = CheckoutRequest.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { input, email, expectedAmountCents, country, timeZone, rail } = parsedBody.data;
  const receiptEmail = email ?? '';

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

  // Concurrent checkouts are allowed. Occupancy is decided at webhook time via
  // expectedVersion + quoted amount, not a global reservation lock.
  const expectedVersion = quote.version;

  const argentina = isArgentinaHint({
    country,
    timeZone,
    acceptLanguage: request.headers.get('accept-language'),
  });
  const preferred: PreferredRail | undefined = rail;
  const railName = resolveCheckoutRail(preferred, argentina);
  const paymentRail = railByName(railName);

  if (railName === 'mercadopago' && !isMercadoPagoConfigured()) {
    return Response.json(
      {
        error: 'mp_credentials_missing',
        message: 'Faltan credenciales de Mercado Pago',
      },
      { status: 503 },
    );
  }

  try {
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
      expectedVersion,
      seed: seedFromBidId(bidId),
      rail: railName,
      status: 'created',
    });

    const intent = await paymentRail.createIntent({
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
      rail: railName,
      redirectUrl: intent.redirectUrl,
      identity: {
        displayName: resolved.displayName,
        imageUrl: resolved.imageUrl,
        key: resolved.key,
      },
    });
  } catch (error) {
    const detail = (error as Error).message;
    console.error('[checkout]', detail);
    if (
      railName === 'mercadopago' &&
      /MP_ACCESS_TOKEN|MP_WEBHOOK_SECRET|MP_USD_ARS_RATE/.test(detail)
    ) {
      return Response.json(
        {
          error: 'mp_credentials_missing',
          message: 'Faltan credenciales de Mercado Pago',
        },
        { status: 503 },
      );
    }
    return Response.json({ error: 'Could not start checkout' }, { status: 502 });
  }
}
