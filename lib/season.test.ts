import { describe, expect, test } from 'bun:test';
import { formatSeasonName, seasonAt, SEASON_EPOCH_MS, SEASON_MS } from './season';

describe('seasonAt', () => {
  test('launch day is season 0', () => {
    const season = seasonAt(new Date(SEASON_EPOCH_MS));
    expect(season.index).toBe(0);
    expect(season.start.getTime()).toBe(SEASON_EPOCH_MS);
    expect(season.end.getTime()).toBe(SEASON_EPOCH_MS + SEASON_MS);
  });

  test('resets every 30 days', () => {
    const lastTick = seasonAt(new Date(SEASON_EPOCH_MS + SEASON_MS - 1));
    const next = seasonAt(new Date(SEASON_EPOCH_MS + SEASON_MS));
    expect(lastTick.index).toBe(0);
    expect(next.index).toBe(1);
    expect(next.start.getTime()).toBe(lastTick.end.getTime());
  });

  test('dates before the epoch still use season 0', () => {
    expect(seasonAt(new Date('2026-01-01T00:00:00.000Z')).index).toBe(0);
  });
});

describe('formatSeasonName', () => {
  test('names the window by its UTC start month', () => {
    const season = seasonAt(new Date('2026-08-22T15:00:00.000Z'));
    expect(formatSeasonName(season, 'en')).toBe('August 2026');
    expect(formatSeasonName(season, 'es').toLowerCase()).toContain('agosto');
    expect(formatSeasonName(season, 'es')).toContain('2026');
  });
});
