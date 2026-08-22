/**
 * 30-day seasons. All-time hits never reset; the season board does.
 *
 * Named after the UTC month the window starts in ("August 2026"), matching the
 * public label. The epoch is 1 Aug 2026 so season 0 is the launch month.
 */
export const SEASON_EPOCH_MS = Date.UTC(2026, 7, 1);
export const SEASON_MS = 30 * 24 * 60 * 60 * 1000;

export interface Season {
  index: number;
  start: Date;
  end: Date;
}

export function seasonAt(now: Date = new Date()): Season {
  const elapsed = now.getTime() - SEASON_EPOCH_MS;
  const index = Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / SEASON_MS)) : 0;
  const startMs = SEASON_EPOCH_MS + index * SEASON_MS;
  return {
    index,
    start: new Date(startMs),
    end: new Date(startMs + SEASON_MS),
  };
}

export function formatSeasonName(season: Season, locale: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(season.start);
}
