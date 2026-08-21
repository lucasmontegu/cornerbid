const DATAFAST_BASE = 'https://datafa.st/api/v1';

export const DATAFAST_WEBSITE_ID =
  process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID ?? 'dfid_4hAWHuxWNq2VUksdfSf6r';

export const DATAFAST_DOMAIN = 'cornerbid.lol';

export const DATAFAST_WIDGET_ID = '6a88a2d8ec7bb6997732bb51';

/** Logo violet — widget query uses this so the embed matches the site. */
export const BRAND_HEX = '8B5CF6';

interface OverviewRow {
  visitors?: number;
}

let cachedVisitors: { value: number; at: number } | null = null;
const VISITORS_TTL_MS = 30_000;

export async function getDataFastVisitorsSinceLaunch(): Promise<number | null> {
  const key = process.env.DATAFAST_API_KEY;
  if (!key) return null;

  if (cachedVisitors && Date.now() - cachedVisitors.at < VISITORS_TTL_MS) {
    return cachedVisitors.value;
  }

  try {
    const response = await fetch(`${DATAFAST_BASE}/analytics/overview?fields=visitors`, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 30 },
    });
    if (!response.ok) return cachedVisitors?.value ?? null;
    const body = (await response.json()) as { data?: OverviewRow[] };
    const visitors = Number(body.data?.[0]?.visitors ?? NaN);
    if (!Number.isFinite(visitors)) return cachedVisitors?.value ?? null;
    cachedVisitors = { value: visitors, at: Date.now() };
    return visitors;
  } catch {
    return cachedVisitors?.value ?? null;
  }
}
