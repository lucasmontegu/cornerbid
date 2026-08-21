/**
 * Click-through for the holder's link.
 *
 * Server-side on purpose: a client-side counter can be blocked by an ad blocker and
 * inflated by anyone with a console, and this number is what the next bidder judges
 * the slot by. It has to be worth trusting.
 */
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { gameState, identities, identityClicks } from '@/db/schema';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identityId: string }> },
): Promise<Response> {
  const { identityId } = await params;

  const rows = await db
    .select({ sourceUrl: identities.sourceUrl, status: identities.status })
    .from(identities)
    .where(eq(identities.id, identityId));

  const identity = rows[0];
  if (!identity || identity.status === 'rejected') {
    return Response.redirect(new URL('/', request.url), 302);
  }

  const url = new URL(identity.sourceUrl);
  url.searchParams.set('utm_source', 'cornerbid');

  const sessionId = request.headers.get('x-session-id');

  // Attribute the click to whichever bid currently holds the slot, so a brand's
  // clicks can be split across separate runs rather than lumped together forever.
  await db.execute(sql`
    WITH holder AS (SELECT current_bid_id FROM game_state WHERE id = 1),
    logged AS (
      INSERT INTO identity_clicks (identity_id, bid_id, session_id)
      SELECT ${identityId}::uuid, (SELECT current_bid_id FROM holder), ${sessionId}
      RETURNING id
    )
    UPDATE identities SET click_count = click_count + 1
    WHERE id = ${identityId}::uuid AND EXISTS (SELECT 1 FROM logged)
  `);

  return Response.redirect(url.toString(), 302);
}
