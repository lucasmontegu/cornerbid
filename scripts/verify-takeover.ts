/**
 * Integration check for lib/takeover.ts against the real database.
 * Creates test rows, exercises the race scenarios, then restores everything.
 */
import { eq, inArray, like, sql } from 'drizzle-orm';
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

async function makeBidder(key: string, amountCents: number, expectedVersion: number) {
  const [identity] = await db.insert(identities).values({
    identityType: 'website', identityKey: key, sourceUrl: `https://${key}`,
    displayName: key, imageUrl: `https://${key}/favicon.ico`,
    email: `${key}@test.local`, status: 'pending',
  }).returning();
  const bidId = crypto.randomUUID();
  await db.insert(bids).values({
    id: bidId, identityId: identity!.id, quotedAmountCents: amountCents,
    expectedVersion, seed: seedFromBidId(bidId), rail: 'polar', status: 'settled',
  });
  return { identityId: identity!.id, bidId, amountCents };
}

const v0 = snapshot.version;
const alice = await makeBidder('test:alice.dev', 10_000, v0);
const bob = await makeBidder('test:bob.dev', 20_000, v0); // same stale version on purpose

// --- A: first valid takeover wins
const a = await tryTakeover({ ...alice, paidAmountCents: alice.amountCents, expectedVersion: v0, seed: seedFromBidId(alice.bidId) });
check('A. valid takeover wins', a.won, true);
check('A. version incremented', a.newVersion, v0 + 1);
check('A. previous holder reported', a.previousIdentityId, snapshot.currentIdentityId);

// --- B: second bid quoted against the now-stale version loses
const b = await tryTakeover({ ...bob, paidAmountCents: bob.amountCents, expectedVersion: v0, seed: seedFromBidId(bob.bidId) });
check('B. stale-version takeover loses', b.won, false);
check('B. no version returned', b.newVersion, null);

const afterB = (await db.select().from(gameState).where(eq(gameState.id, 1)))[0]!;
check('B. slot still held by A', afterB.currentIdentityId, alice.identityId);
check('B. amount unchanged by loser', afterB.currentAmountCents, alice.amountCents);
check('B. version not bumped by loser', afterB.version, v0 + 1);

const bobIdentity = (await db.select().from(identities).where(eq(identities.id, bob.identityId)))[0]!;
check('B. loser identity untouched', bobIdentity.status, 'pending');

// --- statuses after A
const aliceIdentity = (await db.select().from(identities).where(eq(identities.id, alice.identityId)))[0]!;
const oldHolder = (await db.select().from(identities).where(eq(identities.id, snapshot.currentIdentityId!)))[0]!;
check('A. winner is active', aliceIdentity.status, 'active');
check('A. old holder replaced', oldHolder.status, 'replaced');
check('A. old holder accrued time held', oldHolder.secondsHeld >= 0, true);

const aliceBid = (await db.select().from(bids).where(eq(bids.id, alice.bidId)))[0]!;
check('A. winning bid applied', aliceBid.status, 'applied');
check('A. paid amount recorded', aliceBid.paidAmountCents, alice.amountCents);

// --- C: current holder defends their own slot (same identity, higher amount)
const defendBidId = crypto.randomUUID();
await db.insert(bids).values({
  id: defendBidId, identityId: alice.identityId, quotedAmountCents: 30_000,
  expectedVersion: v0 + 1, seed: seedFromBidId(defendBidId), rail: 'polar', status: 'settled',
});
const c = await tryTakeover({ bidId: defendBidId, identityId: alice.identityId, paidAmountCents: 30_000, expectedVersion: v0 + 1, seed: seedFromBidId(defendBidId) });
check('C. self re-bid wins', c.won, true);
const aliceAfterC = (await db.select().from(identities).where(eq(identities.id, alice.identityId)))[0]!;
check('C. self re-bidder stays active (not replaced)', aliceAfterC.status, 'active');

// --- D: paying less than the current holder never takes over
const carol = await makeBidder('test:carol.dev', 100, v0 + 2);
const d = await tryTakeover({ ...carol, paidAmountCents: 100, expectedVersion: v0 + 2, seed: seedFromBidId(carol.bidId) });
check('D. underbid loses even with correct version', d.won, false);

// --- restore
await db.update(gameState).set({
  currentIdentityId: snapshot.currentIdentityId, currentBidId: snapshot.currentBidId,
  currentAmountCents: snapshot.currentAmountCents, version: snapshot.version,
  physicsStartedAt: snapshot.physicsStartedAt, physP: snapshot.physP, physQ: snapshot.physQ,
  nextCornerAt: snapshot.nextCornerAt, reservedAmountCents: null, reservedUntil: null,
}).where(eq(gameState.id, 1));
await db.update(identities).set({ status: 'active', secondsHeld: snapshot ? oldHolder.secondsHeld : 0 })
  .where(eq(identities.id, snapshot.currentIdentityId!));
await db.update(identities).set({ secondsHeld: 0 }).where(eq(identities.id, snapshot.currentIdentityId!));
const testIds = [alice.identityId, bob.identityId, carol.identityId];
await db.delete(bids).where(inArray(bids.identityId, testIds));
await db.delete(identities).where(inArray(identities.id, testIds));

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
