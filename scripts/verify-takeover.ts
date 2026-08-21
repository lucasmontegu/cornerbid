/**
 * Integration check for lib/takeover.ts against the real database.
 * Creates test rows, exercises the race scenarios, then restores everything.
 */
import { eq, inArray, like } from 'drizzle-orm';
import { db } from '@/db';
import { bids, gameState, identities } from '@/db/schema';
import { seedFromBidId } from '@/lib/physics';
import { tryTakeover } from '@/lib/takeover';

const results: string[] = [];
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`);
}

/** Clear leftovers from a run that died partway through. */
async function purgeTestRows() {
  const stale = await db.select({ id: identities.id }).from(identities)
    .where(like(identities.identityKey, 'test:%'));
  if (stale.length === 0) return;
  const ids = stale.map((r) => r.id);
  await db.delete(bids).where(inArray(bids.identityId, ids));
  await db.delete(identities).where(inArray(identities.id, ids));
  console.log(`purged ${ids.length} stale test identities`);
}
await purgeTestRows();

const snapshot = (await db.select().from(gameState).where(eq(gameState.id, 1)))[0]!;

async function makeBidder(key: string, chargeAmountCents: number, expectedVersion: number) {
  const [identity] = await db.insert(identities).values({
    identityType: 'website', identityKey: key, sourceUrl: `https://${key}`,
    displayName: key, imageUrl: `https://${key}/favicon.ico`,
    email: `${key}@test.local`, status: 'pending', paidTotalCents: 0,
  }).returning();
  const bidId = crypto.randomUUID();
  await db.insert(bids).values({
    id: bidId, identityId: identity!.id, quotedAmountCents: chargeAmountCents,
    chargeAmountCents, expectedVersion, seed: seedFromBidId(bidId), rail: 'polar', status: 'settled',
  });
  return { identityId: identity!.id, bidId, chargeAmountCents };
}

const v0 = snapshot.version;
const alice = await makeBidder('test:alice.dev', 10_000, v0);

// --- A: first valid takeover wins
const a = await tryTakeover({ ...alice, expectedVersion: v0, seed: seedFromBidId(alice.bidId) });
check('A. valid takeover wins', a.won, true);
check('A. version incremented', a.newVersion, v0 + 1);
check('A. previous holder reported', a.previousIdentityId, snapshot.currentIdentityId);
check('A. running total is the charge', a.paidTotalCents, 10_000);

const aliceBid = (await db.select().from(bids).where(eq(bids.id, alice.bidId)))[0]!;
check('A. winning bid applied', aliceBid.status, 'applied');
check('A. paid amount is running total', aliceBid.paidAmountCents, 10_000);

const oldHolder = (await db.select().from(identities).where(eq(identities.id, snapshot.currentIdentityId!)))[0]!;
check('A. old holder replaced', oldHolder.status, 'replaced');

// --- C: same identity second $100 charge accumulates to $200 and keeps #1
const aliceRaiseId = crypto.randomUUID();
await db.insert(bids).values({
  id: aliceRaiseId, identityId: alice.identityId, quotedAmountCents: 20_000,
  chargeAmountCents: 10_000, expectedVersion: v0, seed: seedFromBidId(aliceRaiseId),
  rail: 'polar', status: 'settled',
});
const c = await tryTakeover({
  bidId: aliceRaiseId, identityId: alice.identityId, chargeAmountCents: 10_000,
  expectedVersion: v0, seed: seedFromBidId(aliceRaiseId),
});
check('C. two sequential $100 payments become $200', c.won, true);
check('C. running total $200', c.paidTotalCents, 20_000);
const aliceAfterC = (await db.select().from(identities).where(eq(identities.id, alice.identityId)))[0]!;
check('C. paid_total_cents is $200 not last charge', aliceAfterC.paidTotalCents, 20_000);
check('C. self re-bidder stays active', aliceAfterC.status, 'active');
const afterC = (await db.select().from(gameState).where(eq(gameState.id, 1)))[0]!;
check('C. occupant amount is cumulative $200', afterC.currentAmountCents, 20_000);

// --- B: higher cumulative takes the slot even with a stale version token
const bob = await makeBidder('test:bob.dev', 25_000, v0);
const b = await tryTakeover({ ...bob, expectedVersion: v0, seed: seedFromBidId(bob.bidId) });
check('B. higher cumulative wins despite stale version', b.won, true);
const afterB = (await db.select().from(gameState).where(eq(gameState.id, 1)))[0]!;
check('B. slot held by higher total', afterB.currentIdentityId, bob.identityId);
check('B. occupant amount is Bob cumulative', afterB.currentAmountCents, 25_000);
const bobIdentity = (await db.select().from(identities).where(eq(identities.id, bob.identityId)))[0]!;
check('B. Bob paid total is $250', bobIdentity.paidTotalCents, 25_000);
check('B. winner is active', bobIdentity.status, 'active');
const aliceAfterB = (await db.select().from(identities).where(eq(identities.id, alice.identityId)))[0]!;
check('B. Alice paid total kept at $200', aliceAfterB.paidTotalCents, 20_000);

// --- D: paying less than the current holder never takes over (charge still accrues)
const carol = await makeBidder('test:carol.dev', 100, afterB.version);
const d = await tryTakeover({ ...carol, expectedVersion: afterB.version, seed: seedFromBidId(carol.bidId) });
check('D. underbid loses occupancy', d.won, false);
const carolIdentity = (await db.select().from(identities).where(eq(identities.id, carol.identityId)))[0]!;
check('D. underbid still accrued on the card', carolIdentity.paidTotalCents, 100);
const afterD = (await db.select().from(gameState).where(eq(gameState.id, 1)))[0]!;
check('D. occupant unchanged', afterD.currentIdentityId, bob.identityId);
check('D. occupant amount unchanged', afterD.currentAmountCents, 25_000);

// --- restore
await db.update(gameState).set({
  currentIdentityId: snapshot.currentIdentityId, currentBidId: snapshot.currentBidId,
  currentAmountCents: snapshot.currentAmountCents, version: snapshot.version,
  physicsStartedAt: snapshot.physicsStartedAt, physP: snapshot.physP, physQ: snapshot.physQ,
  nextCornerAt: snapshot.nextCornerAt, reservedAmountCents: null, reservedUntil: null,
}).where(eq(gameState.id, 1));
await db.update(identities).set({ status: 'active', secondsHeld: 0 })
  .where(eq(identities.id, snapshot.currentIdentityId!));
const testIds = [alice.identityId, bob.identityId, carol.identityId];
await db.delete(bids).where(inArray(bids.identityId, testIds));
await db.delete(identities).where(inArray(identities.id, testIds));

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
