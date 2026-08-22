/**
 * CornerBid schema.
 *
 * Mirrors docs/plans/2026-08-21-cornerbid-design.md section 4. Money is always
 * integer cents; conversion to a decimal string happens only at a payment rail
 * boundary. Every timestamp is timestamptz — the physics depends on unambiguous
 * instants, not on wall-clock strings.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const identityTypeEnum = pgEnum('identity_type', ['x', 'website']);

export const identityStatusEnum = pgEnum('identity_status', [
  'pending',
  'active',
  'replaced',
  'rejected',
  'outbid',
]);

export const bidStatusEnum = pgEnum('bid_status', [
  'created', // intent created on a rail, buyer has not paid
  'pending', // rail reports payment in flight (delayed methods)
  'settled', // money confirmed by the rail
  'applied', // takeover won, this identity is on screen
  'unwound', // takeover lost: refunded (Polar) or cancelled (Mercado Pago)
  'expired', // checkout abandoned or timed out
]);

/**
 * `house` is not a provider. It marks the seeded CornerBid placeholder, which holds
 * the slot at $0 so that "nobody is holding it" never becomes a special case
 * downstream. It is never settled, refunded or captured.
 */
export const paymentRailEnum = pgEnum('payment_rail', ['polar', 'mercadopago', 'paypal', 'house']);

export const moderationActionEnum = pgEnum('moderation_action', [
  'rejected',
  'restored',
  'banned',
]);

/** Advertiser identity, keyed by `x:<handle>` or `website:<domain>`. */
export const identities = pgTable(
  'identities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identityType: identityTypeEnum('identity_type').notNull(),
    /** Canonical, normalized key. The deduplication boundary for a brand. */
    identityKey: text('identity_key').notNull(),
    sourceUrl: text('source_url').notNull(),
    displayName: text('display_name').notNull(),
    description: text('description'),
    /** Hotlinked third-party URL — see D4. Never proxied through next/image. */
    imageUrl: text('image_url').notNull(),
    /** Unused. Neon Auth was discarded — identity is the URL / @handle. */
    userId: uuid('user_id'),
    email: text('email').notNull(),
    status: identityStatusEnum('status').notNull().default('pending'),

    // Denormalized counters. Read on every page render, so they live here rather
    // than behind an aggregate over identity_views / corner_hits.
    viewCount: integer('view_count').notNull().default(0),
    clickCount: integer('click_count').notNull().default(0),
    cornerCount: integer('corner_count').notNull().default(0),
    secondsHeld: integer('seconds_held').notNull().default(0),
    /**
     * Lifetime USD cents successfully charged for this URL/@handle.
     * Incremented by each paid webhook — never replaced by the latest checkout.
     */
    paidTotalCents: integer('paid_total_cents').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('identities_identity_key_unique').on(t.identityKey),
    index('identities_status_idx').on(t.status),
    index('identities_view_count_idx').on(t.viewCount.desc()),
    index('identities_email_idx').on(t.email),
  ],
);

/** One attempt to take the slot. */
export const bids = pgTable(
  'bids',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),

    /** Intended new slot total at checkout (previous total + this charge). */
    quotedAmountCents: integer('quoted_amount_cents').notNull(),
    /** USD cents charged on this order. Summed into identities.paid_total_cents. */
    chargeAmountCents: integer('charge_amount_cents'),
    /** Running total for this identity after this bid settled. */
    paidAmountCents: integer('paid_amount_cents'),
    addons: jsonb('addons').notNull().default({}),

    /** game_state.version at quote time. Occupancy uses running total, not this token. */
    expectedVersion: integer('expected_version').notNull(),

    /** Drives pickParams(). Derived from the bid id, so the trajectory is reproducible. */
    seed: bigint('seed', { mode: 'bigint' }).notNull(),

    rail: paymentRailEnum('rail').notNull(),
    railIntentId: text('rail_intent_id'),
    /** Mercado Pago only. Polar captures at checkout and has nothing to hold. */
    railAuthorizationId: text('rail_authorization_id'),
    railPaymentId: text('rail_payment_id'),

    status: bidStatusEnum('status').notNull().default('created'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true }),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
  },
  (t) => [
    unique('bids_rail_intent_unique').on(t.rail, t.railIntentId),
    index('bids_status_idx').on(t.status),
    index('bids_identity_idx').on(t.identityId),
    index('bids_created_at_idx').on(t.createdAt.desc()),
  ],
);

/**
 * The singleton. Exactly one row, id = 1, enforced by a check constraint.
 *
 * Holds no position — only the parameters that generate it. See design section 3.
 */
export const gameState = pgTable(
  'game_state',
  {
    id: smallint('id').primaryKey().default(1),

    currentIdentityId: uuid('current_identity_id').references(() => identities.id),
    currentBidId: uuid('current_bid_id').references(() => bids.id),
    currentAmountCents: integer('current_amount_cents').notNull().default(0),

    /** Bumped on every takeover. The optimistic-concurrency token. */
    version: integer('version').notNull().default(0),

    // Physics. Reset on every takeover; the logo relaunches from (0,0).
    physicsStartedAt: timestamp('physics_started_at', { withTimezone: true }).notNull(),
    physP: integer('phys_p').notNull(),
    physQ: integer('phys_q').notNull(),
    /** Precomputed so no reader has to solve for it. Advanced as hits are recorded. */
    nextCornerAt: timestamp('next_corner_at', { withTimezone: true }).notNull(),

    // Reservation: blocks quotes below this while a checkout is in flight.
    reservedAmountCents: integer('reserved_amount_cents'),
    reservedUntil: timestamp('reserved_until', { withTimezone: true }),

    speedMultiplier: numeric('speed_multiplier', { precision: 4, scale: 2 })
      .notNull()
      .default('1'),
    addons: jsonb('addons').notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('game_state_singleton', sql`${t.id} = 1`)],
);

/** Normalized settlement record. Idempotency boundary for both rails' webhooks. */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rail: paymentRailEnum('rail').notNull(),
    /** Provider event id. Unique per rail — replaying an event is a no-op. */
    railEventId: text('rail_event_id').notNull(),
    bidId: uuid('bid_id').references(() => bids.id),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').notNull(),
    raw: jsonb('raw').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('payments_rail_event_unique').on(t.rail, t.railEventId),
    index('payments_bid_idx').on(t.bidId),
  ],
);

/**
 * One row per session per holder. The composite primary key is what makes view
 * counting idempotent: a refresh conflicts and does nothing.
 */
export const identityViews = pgTable(
  'identity_views',
  {
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    /** Client-generated, persisted in localStorage. Not a security boundary. */
    sessionId: text('session_id').notNull(),
    firstSeen: timestamp('first_seen', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.identityId, t.sessionId] })],
);

/**
 * Individual click events.
 *
 * A denormalized counter can give a lifetime total but never a rate: it does not know
 * *when* it was incremented. "922 clicks/h" is the number that sells the slot to the
 * next bidder — it says traffic is happening right now — so the timestamps have to
 * exist. `identities.click_count` stays as the cheap lifetime total.
 */
export const identityClicks = pgTable(
  'identity_clicks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    /** Which run of the slot earned this click. Null for clicks from the ranking. */
    bidId: uuid('bid_id').references(() => bids.id),
    clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),
    /** Kept so clicks can be deduplicated later without recounting history. */
    sessionId: text('session_id'),
  },
  (t) => [
    // Trending reads "clicks in the last hour, grouped by identity", so the index
    // has to lead with time.
    index('identity_clicks_clicked_at_idx').on(t.clickedAt.desc()),
    index('identity_clicks_identity_time_idx').on(t.identityId, t.clickedAt.desc()),
  ],
);

/**
 * Corner hits, written lazily by /api/state.
 *
 * Unique on (bid_id, corner_index): one row per hit of this occupancy. The same
 * identity can occupy again and keep accumulating — identity+index would collide
 * on the second run's first corner. Concurrency is still "exactly one row": any
 * number of readers can race the same (bid, index) and ON CONFLICT drops extras.
 */
export const cornerHits = pgTable(
  'corner_hits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    bidId: uuid('bid_id')
      .notNull()
      .references(() => bids.id),
    /** Nth corner of this occupancy. Derived from elapsed time, never from position. */
    cornerIndex: integer('corner_index').notNull(),
    hitAt: timestamp('hit_at', { withTimezone: true }).notNull(),
    viewersApprox: integer('viewers_approx'),
  },
  (t) => [
    unique('corner_hits_bid_index_unique').on(t.bidId, t.cornerIndex),
    index('corner_hits_identity_idx').on(t.identityId),
    index('corner_hits_hit_at_idx').on(t.hitAt.desc()),
  ],
);

export const moderationEvents = pgTable(
  'moderation_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identityId: uuid('identity_id')
      .notNull()
      .references(() => identities.id),
    action: moderationActionEnum('action').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('moderation_events_identity_idx').on(t.identityId)],
);

export type Identity = typeof identities.$inferSelect;
export type NewIdentity = typeof identities.$inferInsert;
export type Bid = typeof bids.$inferSelect;
export type NewBid = typeof bids.$inferInsert;
export type GameState = typeof gameState.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type CornerHit = typeof cornerHits.$inferSelect;
export type PaymentRailName = (typeof paymentRailEnum.enumValues)[number];
/** Rails that a PaymentRail implementation actually exists for. Excludes `house`. */
export type SettleableRail = Exclude<PaymentRailName, 'house'>;
export type BidStatus = (typeof bidStatusEnum.enumValues)[number];
export type IdentityStatus = (typeof identityStatusEnum.enumValues)[number];
export type IdentityClick = typeof identityClicks.$inferSelect;
