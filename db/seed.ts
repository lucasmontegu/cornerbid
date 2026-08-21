/**
 * Seeds the game_state singleton and the CornerBid house placeholder.
 *
 * Idempotent: running it twice is a no-op. Safe to run against production.
 *
 * The placeholder is a normal holder that paid $0 on the `house` rail. Modelling it
 * that way means no downstream code — renderer, /api/state, corner-hit recording,
 * ranking — ever needs an "empty slot" branch.
 */
import { eq, sql } from 'drizzle-orm';
import { cornerPeriodSeconds, pickParams, seedFromBidId } from '../lib/physics';
import { db } from './index';
import { bids, gameState, identities } from './schema';

const PLACEHOLDER_KEY = 'website:cornerbid.lol';

async function seed() {
  const existing = await db.select({ id: gameState.id }).from(gameState).limit(1);
  if (existing.length > 0) {
    console.log('game_state already seeded, nothing to do');
    return;
  }

  const [identity] = await db
    .insert(identities)
    .values({
      identityType: 'website',
      identityKey: PLACEHOLDER_KEY,
      sourceUrl: 'https://cornerbid.lol',
      displayName: 'CornerBid',
      description: 'Only one logo can hit the corner.',
      imageUrl: '/cornerbid-logo.png',
      email: 'house@cornerbid.lol',
      status: 'active',
    })
    .onConflictDoNothing({ target: identities.identityKey })
    .returning();

  const identityId =
    identity?.id ??
    (
      await db
        .select({ id: identities.id })
        .from(identities)
        .where(eq(identities.identityKey, PLACEHOLDER_KEY))
    )[0]!.id;

  const bidId = crypto.randomUUID();
  const seedValue = seedFromBidId(bidId);
  const params = pickParams(seedValue);

  await db.insert(bids).values({
    id: bidId,
    identityId,
    quotedAmountCents: 0,
    paidAmountCents: 0,
    expectedVersion: 0,
    seed: seedValue,
    rail: 'house',
    status: 'applied',
    appliedAt: new Date(),
  });

  const startedAt = new Date();
  const periodSeconds = cornerPeriodSeconds(params);

  await db.insert(gameState).values({
    id: 1,
    currentIdentityId: identityId,
    currentBidId: bidId,
    currentAmountCents: 0,
    version: 0,
    physicsStartedAt: startedAt,
    physP: params.p,
    physQ: params.q,
    nextCornerAt: new Date(startedAt.getTime() + periodSeconds * 1000),
  });

  console.log(
    `seeded: placeholder holds the slot, p=${params.p} q=${params.q}, ` +
      `first corner in ${(periodSeconds / 60).toFixed(1)} min`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('seed failed:', error);
    process.exit(1);
  });
