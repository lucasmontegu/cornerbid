/**
 * Live strip numbers. Polled far more slowly than `/api/state`, and cached at
 * the edge, because none of these move on a per-frame basis.
 */
import { getLiveStats } from '@/lib/live-stats';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  // Generous: the client polls every 25s, so this only catches abuse.
  if (!rateLimit(`live-stats:${clientIp(request)}`, 30, 60_000)) {
    return tooManyRequests();
  }

  return Response.json(await getLiveStats(), {
    headers: { 'cache-control': 'public, max-age=10, stale-while-revalidate=30' },
  });
}
