/**
 * Preview endpoint for the bid sheet. Resolves an input to a logo without persisting
 * anything — the authoritative resolution happens again inside /api/checkout.
 */
import { isBlockedIdentity } from '@/lib/blocklist';
import { parseIdentityInput, resolveIdentity } from '@/lib/identity';
import { getQuote } from '@/lib/pricing';
import { chargeDeltaCents, nextStakeCents } from '@/lib/raise';
import { getCommittedCents } from '@/lib/stake';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(request: Request): Promise<Response> {
  if (!rateLimit(`resolve:${clientIp(request)}`, 20, 60_000)) {
    return tooManyRequests();
  }

  const body = (await request.json().catch(() => null)) as { input?: unknown } | null;

  if (typeof body?.input !== 'string') {
    return Response.json({ error: 'input is required' }, { status: 400 });
  }

  const parsed = parseIdentityInput(body.input);
  if (!parsed) {
    return Response.json(
      { error: 'Use an X handle like @levelsio, or a domain like fiber.so' },
      { status: 400 },
    );
  }

  if (isBlockedIdentity(parsed)) {
    return Response.json({ error: 'That listing is not allowed.' }, { status: 422 });
  }

  try {
    const [resolved, quote, alreadyCommittedCents] = await Promise.all([
      resolveIdentity(parsed),
      getQuote(),
      getCommittedCents(parsed.key),
    ]);

    const quotedTotalCents = nextStakeCents(alreadyCommittedCents, quote.amountCents);
    const chargeAmountCents = chargeDeltaCents(quotedTotalCents, alreadyCommittedCents);

    return Response.json(
      {
        ...resolved,
        alreadyCommittedCents,
        chargeAmountCents,
        quoteAmountCents: quote.amountCents,
      },
      {
        headers: { 'Cache-Control': 'private, max-age=60' },
      },
    );
  } catch (error) {
    console.warn('[resolve-identity]', parsed.key, (error as Error).message);
    return Response.json(
      { error: 'Could not read that site. Check the address and try again.' },
      { status: 422 },
    );
  }
}
