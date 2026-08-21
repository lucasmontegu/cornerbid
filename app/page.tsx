import { GameLiveProvider } from '@/components/game-live';
import { LiveBidSheet } from '@/components/live-bid-sheet';
import { LiveLeaderboard } from '@/components/live-leaderboard';
import { SiteHeader } from '@/components/site-header';
import { ViewBeacon } from '@/components/view-beacon';
import { VisitorPill } from '@/components/visitor-pill';
import { getRanking, getRecentActivity, getTrending } from '@/lib/leaderboard';
import { getDataFastVisitorsSinceLaunch } from '@/lib/datafast';
import { interpolate, messages } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n-server';
import { getQuote } from '@/lib/pricing';
import { cornerPeriodSeconds } from '@/lib/physics';
import { formatUsd } from '@/lib/money';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import type { GameSnapshot } from './api/state.types';

export const dynamic = 'force-dynamic';

async function loadSnapshot(): Promise<GameSnapshot | null> {
  const rows = await db.execute(sql`
    SELECT g.version, g.current_amount_cents, g.phys_p, g.phys_q,
           g.physics_started_at, g.current_identity_id,
           (g.reserved_until IS NOT NULL AND g.reserved_until > now()) AS is_reserved,
           i.identity_key, i.display_name, i.image_url, i.source_url, i.description,
           i.click_count, i.corner_count, now() AS server_now
    FROM game_state g JOIN identities i ON i.id = g.current_identity_id WHERE g.id = 1
  `);
  const row = rows.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  const params = { p: Number(row.phys_p), q: Number(row.phys_q) };
  const quote = await getQuote();

  return {
    version: Number(row.version),
    serverNow: new Date(row.server_now as string).getTime(),
    holder: {
      identityId: row.current_identity_id as string,
      identityKey: row.identity_key as string,
      displayName: row.display_name as string,
      imageUrl: row.image_url as string,
      sourceUrl: row.source_url as string,
      description: (row.description as string | null) ?? null,
      clickCount: Number(row.click_count ?? 0),
      cornerCount: Number(row.corner_count ?? 0),
    },
    physics: {
      ...params,
      startedAt: new Date(row.physics_started_at as string).getTime(),
      periodSeconds: cornerPeriodSeconds(params),
    },
    amountCents: Number(row.current_amount_cents ?? 0),
    nextAmountCents: quote.amountCents,
    reserved: Boolean(row.is_reserved),
  };
}

export default async function Home() {
  const locale = await getLocale();
  const t = (key: keyof (typeof messages)['en'], vars?: Record<string, string | number>) => {
    const template = messages[locale][key];
    return vars ? interpolate(template, vars) : template;
  };

  const [snapshot, trending, ranking, activity, visitors] = await Promise.all([
    loadSnapshot(),
    getTrending(),
    getRanking(100),
    getRecentActivity(),
    getDataFastVisitorsSinceLaunch(),
  ]);

  if (!snapshot) {
    return (
      <main className="grid min-h-dvh place-items-center bg-paper text-hush">
        {t('unseeded')} <code className="mx-2">bun run db:seed</code>
      </main>
    );
  }

  function ago(date: Date): string {
    const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return t('justNow');
    if (seconds < 3600) return t('minAgo', { n: Math.floor(seconds / 60) });
    return t('hoursAgo', { n: Math.floor(seconds / 3600) });
  }

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <a
        href="#bid"
        className="sr-only focus:not-sr-only focus:absolute focus:z-20 focus:m-3 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        {t('skipToBid')}
      </a>
      <GameLiveProvider initial={snapshot}>
      <ViewBeacon identityId={snapshot.holder.identityId} />

      <SiteHeader locale={locale} />

      <div className="relative z-10 px-5 sm:px-8">
        <VisitorPill locale={locale} visitorsSinceLaunch={visitors} />
      </div>

      <section id="bid" className="relative z-10 mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <LiveBidSheet />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] bg-paper p-5 shadow-[var(--shadow-border)]">
            <h2 className="mb-3 text-sm font-semibold">{t('trending')}</h2>
            {trending.length === 0 ? (
              <p className="text-sm text-hush">{t('noTrending')}</p>
            ) : (
              <ul className="space-y-2">
                {trending.map((entry) => (
                  <li key={entry.identityId} className="flex items-center gap-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageUrl}
                      alt=""
                      className="size-5 rounded outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                    />
                    <span className="flex-1 truncate font-medium">{entry.displayName}</span>
                    <span className="text-hush">{t('clicksPerHour', { n: entry.clicksPerHour })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[28px] bg-paper p-5 shadow-[var(--shadow-border)]">
            <h2 className="mb-3 text-sm font-semibold">{t('activity')}</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-hush">{t('noActivity')}</p>
            ) : (
              <ul className="space-y-2">
                {activity.map((entry, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageUrl}
                      alt=""
                      className="size-5 rounded outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                    />
                    <span className="flex-1 truncate">
                      <span className="font-medium">{entry.displayName}</span>{' '}
                      <span className="text-hush">· {formatUsd(entry.amountCents)}</span>
                    </span>
                    <span className="text-hush">{ago(entry.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-10">
          <LiveLeaderboard ranking={ranking} locale={locale} />
        </div>
      </section>
      </GameLiveProvider>
    </main>
  );
}
