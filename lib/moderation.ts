/**
 * Restore a previous holder after the current listing is killed.
 *
 * The kill switch has to work in under a minute (design §9). Auth is still pending,
 * so this is gated by ADMIN_SECRET. Neon Auth was discarded.
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { gameState, identities, moderationEvents } from '@/db/schema';
import { cornerPeriodSeconds, pickParams } from '@/lib/physics';

export async function rejectIdentity(identityId: string, reason: string): Promise<void> {
  const state = (await db.select().from(gameState).where(eq(gameState.id, 1)))[0];
  if (!state) throw new Error('game_state is not seeded');

  await db.insert(moderationEvents).values({
    identityId,
    action: 'rejected',
    reason,
  });

  await db
    .update(identities)
    .set({ status: 'rejected' })
    .where(eq(identities.id, identityId));

  if (state.currentIdentityId !== identityId) return;

  const previous = await db.execute(sql`
    SELECT b.id, b.identity_id, b.seed
    FROM bids b
    JOIN identities i ON i.id = b.identity_id
    WHERE b.status = 'applied'
      AND b.identity_id <> ${identityId}::uuid
      AND i.status <> 'rejected'
    ORDER BY b.applied_at DESC NULLS LAST
    LIMIT 1
  `);
  const row = previous.rows[0] as
    | { id: string; identity_id: string; seed: string | number | bigint }
    | undefined;

  if (!row) {
    throw new Error('no previous holder to restore — re-seed the house placeholder');
  }

  const seed = typeof row.seed === 'bigint' ? row.seed : BigInt(row.seed);
  const params = pickParams(seed);
  const periodSeconds = cornerPeriodSeconds(params);

  await db.execute(sql`
    UPDATE game_state SET
      current_identity_id  = ${row.identity_id}::uuid,
      current_bid_id       = ${row.id}::uuid,
      version              = version + 1,
      physics_started_at   = now(),
      phys_p               = ${params.p},
      phys_q               = ${params.q},
      next_corner_at       = now() + make_interval(secs => ${periodSeconds}),
      reserved_amount_cents = NULL,
      reserved_until       = NULL,
      updated_at           = now()
    WHERE id = 1
  `);

  await db
    .update(identities)
    .set({ status: 'active' })
    .where(eq(identities.id, row.identity_id));
}

export function isAdminRequest(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get('x-admin-secret') === secret;
}
