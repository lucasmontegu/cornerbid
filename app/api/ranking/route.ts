import { getRanking, getRecentActivity, getTrending } from '@/lib/leaderboard';
import { formatSeasonName, seasonAt } from '@/lib/season';

export const dynamic = 'force-dynamic';

function serializeRanking(entries: Awaited<ReturnType<typeof getRanking>>) {
  return entries.map((entry) => ({
    ...entry,
    heldAt: entry.heldAt.toISOString(),
  }));
}

export async function GET(): Promise<Response> {
  const season = seasonAt();
  const [ranking, seasonRanking, trending, activity] = await Promise.all([
    getRanking(),
    getRanking(100, { scope: 'season', now: season.start }),
    getTrending(),
    getRecentActivity(),
  ]);

  return Response.json(
    {
      ranking: serializeRanking(ranking),
      seasonRanking: serializeRanking(seasonRanking),
      season: {
        start: season.start.toISOString(),
        end: season.end.toISOString(),
        label: formatSeasonName(season, 'en'),
      },
      trending,
      activity: activity.map((entry) => ({
        ...entry,
        at: entry.at.toISOString(),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
