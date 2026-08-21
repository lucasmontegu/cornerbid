/**
 * Record a unique view for the current holder.
 *
 * session_id is client-generated and stored in localStorage. ON CONFLICT DO NOTHING
 * means a refresh does not inflate the counter.
 */
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

const ViewRequest = z.object({
  identityId: z.uuid(),
  sessionId: z.string().min(8).max(80),
});

export async function POST(request: Request): Promise<Response> {
  if (!rateLimit(`view:${clientIp(request)}`, 30, 60_000)) {
    return tooManyRequests();
  }

  const parsed = ViewRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { identityId, sessionId } = parsed.data;

  await db.execute(sql`
    WITH ins AS (
      INSERT INTO identity_views (identity_id, session_id)
      VALUES (${identityId}::uuid, ${sessionId})
      ON CONFLICT DO NOTHING
      RETURNING identity_id
    )
    UPDATE identities
    SET view_count = view_count + 1
    WHERE id = ${identityId}::uuid AND EXISTS (SELECT 1 FROM ins)
  `);

  return Response.json({ ok: true });
}
