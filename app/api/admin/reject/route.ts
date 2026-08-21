import { z } from 'zod';
import { isAdminRequest, rejectIdentity } from '@/lib/moderation';

const RejectRequest = z.object({
  identityId: z.uuid(),
  reason: z.string().min(1).max(500),
});

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = RejectRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  await rejectIdentity(parsed.data.identityId, parsed.data.reason);
  return Response.json({ ok: true });
}
