/**
 * The payload /api/state returns and the arena polls. Kept free of any database
 * import so the client can share the type without pulling in neon-http.
 */
export interface IdentityPreview {
  key: string;
  displayName: string;
  description: string | null;
  imageUrl: string;
  /** Lifetime total already settled/applied for this key. Raise pays the delta. */
  alreadyCommittedCents?: number;
  /** What checkout will charge at the current quote. */
  chargeAmountCents?: number;
  quoteAmountCents?: number;
}

export interface PublicHolder {
  id: string;
  displayName: string;
  description: string | null;
  imageUrl: string;
  clickCount: number;
  viewCount: number;
  cornerCount: number;
}

export interface PublicGameState {
  /** Server epoch milliseconds. Used to derive clock offset. */
  serverNow: number;
  version: number;
  currentAmountCents: number;
  quoteAmountCents: number;
  reserved: boolean;
  physicsStartedAt: number;
  physP: number;
  physQ: number;
  holder: PublicHolder;
}
