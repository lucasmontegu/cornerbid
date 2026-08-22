const DATAFAST_BASE = 'https://datafa.st/api/v1';

export const DATAFAST_WEBSITE_ID =
  process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID ?? 'dfid_4hAWHuxWNq2VUksdfSf6r';

export const DATAFAST_DOMAIN = 'cornerbid.lol';

/** Logo violet. Kept for any embed that still needs the site's accent. */
export const BRAND_HEX = '8B5CF6';

/**
 * Last good value per endpoint.
 *
 * Serves two purposes, and the second one matters more: it caps how often a
 * page render can hit DataFast, and it lets a failed request fall back to the
 * previous number instead of blanking the stat. A live counter that flickers to
 * nothing on one bad response reads as broken, not as honest.
 */
const cache = new Map<string, { value: number; at: number }>();

interface VisitorRow {
  visitors?: number;
}

async function visitorCount(path: string, ttlMs: number): Promise<number | null> {
  const key = process.env.DATAFAST_API_KEY;
  if (!key) return null;

  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;

  try {
    const response = await fetch(`${DATAFAST_BASE}${path}`, {
      headers: { Authorization: `Bearer ${key}` },
      // Seconds, and Next wants a literal-ish number. Mirrors ttlMs.
      next: { revalidate: Math.round(ttlMs / 1000) },
    });
    if (!response.ok) return hit?.value ?? null;

    const body = (await response.json()) as { data?: VisitorRow[] };
    const visitors = Number(body.data?.[0]?.visitors ?? NaN);
    if (!Number.isFinite(visitors)) return hit?.value ?? null;

    cache.set(path, { value: visitors, at: Date.now() });
    return visitors;
  } catch {
    return hit?.value ?? null;
  }
}

/**
 * People with pageview activity in the last 10 minutes — DataFast's own
 * realtime window, not something derived here.
 *
 * Null when DATAFAST_API_KEY is absent, which is the normal local state. Every
 * caller must render without it rather than showing a zero, because "0 watching"
 * is a claim and a missing key is not evidence for it.
 */
export async function getDataFastVisitorsOnline(): Promise<number | null> {
  return visitorCount('/analytics/realtime?fields=visitors', 15_000);
}

/** All-time unique visitors. Shown in the footer's house row. */
export async function getDataFastVisitorsSinceLaunch(): Promise<number | null> {
  return visitorCount('/analytics/overview?fields=visitors', 30_000);
}
