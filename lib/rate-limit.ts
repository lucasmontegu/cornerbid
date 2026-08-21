/**
 * Best-effort in-memory limiter. Serverless instances do not share this map, so it
 * is a speed bump, not a guarantee. Polar / Mercado Pago still run buyer-side fraud
 * screens; this just keeps a single IP from hammering resolve/checkout.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= max) return false;
  existing.count += 1;
  return true;
}

export function tooManyRequests(): Response {
  return Response.json(
    { error: 'rate_limited', message: 'Slow down and try again in a moment.' },
    { status: 429 },
  );
}
