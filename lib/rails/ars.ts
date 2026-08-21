/**
 * USD cents → ARS decimal, frozen at intent-creation time.
 *
 * Mercado Pago Checkout Pro charges ARS. The rate lives in env so a bid cannot
 * reprice between the quote the buyer saw and the preference we create.
 */
export function usdCentsToArs(usdCents: number, arsPerUsd: number): number {
  if (!Number.isFinite(arsPerUsd) || arsPerUsd <= 0) {
    throw new Error('MP_USD_ARS_RATE must be a positive number of ARS per 1 USD');
  }
  if (!Number.isFinite(usdCents) || usdCents <= 0) {
    throw new Error('charge amount must be a positive USD-cent total');
  }
  return Number(((usdCents / 100) * arsPerUsd).toFixed(2));
}

export function arsRateFromEnv(): number {
  const raw = process.env.MP_USD_ARS_RATE;
  const rate = Number(raw);
  if (!raw || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('MP_USD_ARS_RATE is not set');
  }
  return rate;
}
