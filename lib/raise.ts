/**
 * Same URL / @handle later = raise by paying the difference.
 *
 * The slot price is always a *total*. Returning brands are charged
 * `quotedTotal - alreadyCommitted`, never the full quote again.
 * Each paid webhook then adds that charge onto the identity's running total.
 */
export function chargeDeltaCents(quotedTotalCents: number, alreadyCommittedCents: number): number {
  return Math.max(0, quotedTotalCents - alreadyCommittedCents);
}

/** Accrue a successful charge onto the identity's lifetime total. */
export function addChargeCents(runningTotalCents: number, chargeAmountCents: number): number {
  return runningTotalCents + chargeAmountCents;
}

/**
 * Running stake for one identity_key.
 *
 * - Incoming above the committed total is a *target* (pay the difference).
 * - Incoming at or below the committed total is *additive* (previous + this charge).
 *
 * So $10 then a $20 target → $20, and $10 then another $10 checkout → $20.
 * tryTakeover must see this new total, never the charge alone.
 */
export function nextStakeCents(previousCommittedCents: number, incomingCents: number): number {
  if (incomingCents > previousCommittedCents) return incomingCents;
  return previousCommittedCents + incomingCents;
}
