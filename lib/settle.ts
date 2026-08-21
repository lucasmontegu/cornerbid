/**
 * The settlement pipeline, shared by every rail.
 *
 * A rail's only job is to verify its own webhook and normalize it. From here on the
 * flow is identical no matter who took the money.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { bids, payments } from '@/db/schema';
import { RailVerificationError, type PaymentRail, type SettlementEvent } from '@/lib/rails/types';
import { placeBidOnBoard, tryTakeover } from '@/lib/takeover';

export async function settleFromRail(
  rail: PaymentRail,
  request: Request,
): Promise<Response> {
  let event: SettlementEvent | null;

  try {
    event = await rail.verify(request);
  } catch (error) {
    if (error instanceof RailVerificationError) {
      console.error(`[${rail.name}-webhook] rejected:`, error.message);
      return new Response('invalid webhook', { status: 403 });
    }
    throw error;
  }

  // Non-settlement events are still successful deliveries. A non-2xx would make the
  // provider retry them forever.
  if (!event) return Response.json({ ignored: true });

  /**
   * Idempotency gate, recorded before the takeover deliberately. Losing a retry means
   * one bid needs manual attention; processing twice would mean a double takeover and
   * a second charge, which cannot be repaired from a log.
   */
  const recorded = await db
    .insert(payments)
    .values({
      rail: event.rail,
      railEventId: event.eventId,
      bidId: event.bidId,
      amountCents: event.amountCents,
      currency: event.currency,
      raw: event.raw as object,
    })
    .onConflictDoNothing({ target: [payments.rail, payments.railEventId] })
    .returning({ id: payments.id });

  if (recorded.length === 0) return Response.json({ duplicate: true });

  const bid = (await db.select().from(bids).where(eq(bids.id, event.bidId)))[0];
  if (!bid) {
    console.error(`[${rail.name}-webhook] settled payment references unknown bid`, event.bidId);
    return Response.json({ error: 'unknown bid' }, { status: 202 });
  }

  await db
    .update(bids)
    .set({ status: 'settled', settledAt: new Date(), railPaymentId: event.paymentId })
    .where(eq(bids.id, bid.id));

  const chargeAmountCents =
    (bid.chargeAmountCents && bid.chargeAmountCents > 0
      ? bid.chargeAmountCents
      : event.amountCents > 0
        ? event.amountCents
        : bid.quotedAmountCents) || 0;

  const result = await tryTakeover({
    bidId: bid.id,
    identityId: bid.identityId,
    chargeAmountCents,
    expectedVersion: bid.expectedVersion,
    seed: bid.seed,
  });

  if (!result.won) {
    await placeBidOnBoard(bid.identityId);
  }

  await rail.settle(event, 'won');

  console.log(
    `[${rail.name}-webhook] bid=${bid.id} amount=${event.amountCents} won=${result.won}`,
  );

  return Response.json({ won: result.won, version: result.newVersion });
}
