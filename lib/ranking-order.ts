/** Same order the board uses: more hits first; earlier to that count wins ties. */
export function sortRanking<T extends { cornerCount: number; heldAt: Date }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (b.cornerCount !== a.cornerCount) return b.cornerCount - a.cornerCount;
    return a.heldAt.getTime() - b.heldAt.getTime();
  });
}
