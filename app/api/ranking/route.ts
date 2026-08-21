import { getRanking, getRecentActivity, getTrending } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const [ranking, trending, activity] = await Promise.all([
    getRanking(),
    getTrending(),
    getRecentActivity(),
  ]);

  return Response.json(
    {
      ranking: ranking.map((entry) => ({
        ...entry,
        heldAt: entry.heldAt.toISOString(),
      })),
      trending,
      activity: activity.map((entry) => ({
        ...entry,
        at: entry.at.toISOString(),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
