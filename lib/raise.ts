/**
 * Same URL / @handle later = raise by paying the difference.
 *
 * The slot price is always a *total*. Returning brands are charged
 * `quotedTotal - alreadyCommitted`, never the full quote again.
 */
export function chargeDeltaCents(quotedTotalCents: number, alreadyCommittedCents: number): number {
  return Math.max(0, quotedTotalCents - alreadyCommittedCents);
}
