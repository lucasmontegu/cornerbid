/** Shared between the route and the client renderer. */
export interface GameSnapshot {
  version: number;
  /** Server clock at response time. The client corrects its own drift against this. */
  serverNow: number;
  holder: {
    identityId: string;
    identityKey?: string;
    displayName: string;
    imageUrl: string;
    sourceUrl: string;
    description: string | null;
    clickCount: number;
    cornerCount: number;
  };
  physics: {
    p: number;
    q: number;
    /** Epoch ms. Elapsed time is measured from here, never from a local clock. */
    startedAt: number;
    periodSeconds: number;
  };
  amountCents: number;
  /** What the next bidder must pay. */
  nextAmountCents: number;
  /** Always false. Checkout no longer holds a global reservation. */
  reserved: boolean;
}
