/**
 * Clock-skew correction for deterministic physics.
 *
 * Every viewer must agree on "now" or they compute a different position from the
 * same `physics_started_at`. /api/state returns `serverNow`; the client keeps a
 * smoothed offset so a single slow poll does not jerk the logo.
 */

export const CLOCK_SMOOTHING = 0.2;

export function sampleOffset(serverNowMs: number, clientNowMs: number): number {
  return serverNowMs - clientNowMs;
}

/**
 * Exponential moving average. `previous` is null on the first sample so we snap
 * to the offset immediately rather than easing in from zero (which would put the
 * logo in the wrong place for several seconds).
 */
export function smoothOffset(previous: number | null, sample: number): number {
  if (previous === null) return sample;
  return previous * (1 - CLOCK_SMOOTHING) + sample * CLOCK_SMOOTHING;
}

export function correctedNow(clientNowMs: number, offsetMs: number): number {
  return clientNowMs + offsetMs;
}
