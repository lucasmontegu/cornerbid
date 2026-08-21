# CornerBid — Design Document

Date: 2026-08-21
Status: approved, pending implementation
Stack: Next.js 16 (App Router) · Neon Postgres · Polar (global) + Mercado Pago Checkout Pro (AR) · Drizzle ORM · TypeScript

> Amendment 2026-08-21: **Neon Auth is discarded.** Identity is the product URL or
> X/Twitter `@handle` — no login. Same identifier later raises the bid by paying
> the difference. **Mercado Pago is Checkout Pro only** (Preference + hosted
> redirect), not Bricks / Checkout API. Checkout Pro captures on approval, so a
> lost Argentine bid is refunded rather than a cancelled authorization. Polar
> remains the global rail; `x-vercel-ip-country` / `cf-ipcountry` `AR` selects MP.

---

## 1. Summary

A single-screen, always-on site showing one bouncing DVD-style logo. One ad slot
exists. The highest payer owns it. When the logo hits an exact corner, the site
celebrates. The corner hit is the viral hook.

Promise: **Only one logo can hit the corner. Outbid the current one and it's yours.**

---

## 2. Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Deterministic physics, corner time hidden, seeded per holder | No physics state to sync. Server computes the corner analytically. No cron, no simulation, no cheating surface. |
| D2 | Guest-first checkout, **no Neon Auth** | Impulse traffic from X. Identity is the URL / `@handle`. Email is only for the receipt. Same key later = pay the difference. |
| D3 | Namespaced identity: `x:<handle>` or `website:<domain>` | Replaces manual logo upload with a single input. Deduplicates brands, enables history, removes the upload attack surface. |
| D4 | Hotlink the resolved image (no snapshot) | Ship speed. Accepted risk: the advertiser controls the pixel after approval. Mitigated by the admin kill switch. Migrating to blob snapshots later is a backfill, not a redesign. |
| D5 | Short reservation, then rail-specific settlement | Reserving the quoted amount for 5 minutes makes simultaneous outbids rare. Polar and Checkout Pro both capture on approval, so a lost bid is refunded. (`capture: false` would require Bricks and is out of scope.) |
| D6 | Two payment rails behind one interface: Polar (global) + Mercado Pago (AR) | PayPal account creation blocked. Polar rejected this category (see §12) but is being used anyway to ship — **accepted business risk, explicitly taken**. The `PaymentRail` interface is the hedge: if Polar closes the account, swapping rails touches one module, not the schema, the physics or the takeover. |
| D7 | The corner cannot be bought | `pickParams` ignores the amount paid. Every holder gets a 5–15 minute wait drawn from the same table. Paying more buys the slot, never a sooner corner — the wait *is* the product. |
| D8 | Own Postgres counters for the public ranking | Views, clicks and corner hits are read on every page render and must be cheap and consistent. A product-analytics tool is the wrong shape for data the site itself displays. PostHog stays optional and separate. |

---

## 3. Deterministic physics

### 3.1 The corner problem

With elastic bounces and constant velocity, position is a pure triangular wave:

```
A = W - w                    # logical viewport minus logo, X axis
B = H - h                    # same, Y axis
x(t) = tri(x0 + vx*t, A)
y(t) = tri(y0 + vy*t, B)
```

A corner is hit only when both axes touch an edge in the same instant:

```
k * (A/vx) == m * (B/vy)     for integers k, m
```

Let `Tx = A/vx` and `Ty = B/vy`. **A corner exists if and only if `Tx/Ty` is
rational.** If `Tx/Ty = p/q` in lowest terms, the first corner lands at exactly:

```
t_corner = q * Tx
```

Two consequences that drive the whole design:

- Picking a **continuous angle** (`angle = 0.35 + rand * 0.9`) makes `tan(angle)`
  irrational with probability 1. The logo then **never** hits a corner. This is the
  trap to avoid.
- With `vx = vy = 200` on a 1600x900 / 160x90 setup, `Tx/Ty = 1440/810` reduces to
  `16/9`, so `q = 9` and a corner lands every `9 * 7.2 =` **64.8 seconds** —
  clockwork. Viewers spot the script in two minutes and the hook dies.

### 3.2 The parameterization

The seed does not pick an angle. It picks a **coprime pair `(p, q)`** from a
precomputed table, which directly sets the corner time.

```
Logical viewport: W=1600, H=900, plate 160x160  ->  A=1440, B=740
Base speed:       vx = 240  ->  Tx = A/vx = 6s

t_corner = q * Tx                    # q IS the corner time, in units of Tx
vy       = B * p / (Tx * q)          # derived so that Tx/Ty == p/q exactly
```

Table constraints:
- `gcd(p, q) == 1`
- `q * Tx` within **[5 min, 15 min]** -> `q` in `[50, 150]`
- `vy` within `[180, 320] px/s` so motion still reads as natural

Worked example: `q = 80`, `p = 143` (coprime with 80).
`vy = 810 * 143 / (6 * 80) = 241.3 px/s`, `t_corner = 80 * 6 = 480s = 8 min exactly`.

### 3.2b The plate

The bouncing object is a **fixed 160x160 square plate**, not the raw logo. The logo is
contained inside it with padding.

Logos arrive at wildly different aspect ratios: X avatars are square, `og:image` is
about 1.91:1. If the box matched the image, its dimensions would change per holder,
and `A`, `B`, the ratio and every coprime pair would change with it — a different
physics table for every advertiser.

A fixed square also makes the corner land honestly. The plate's own corner is what
touches the screen's corner, so there is never a gap between what bounces and what
the viewer sees. A logo letterboxed inside a mismatched box would stop short of the
edge at the exact moment the whole product depends on.

The plate **changes colour on every bounce**, like the original DVD screensaver.
Colour is derived from `bounceCountAt()` advanced by the golden angle, so it is
deterministic: every viewer sees the same colour at the same instant with nothing
crossing the network.

### 3.3 Start position

**Every takeover starts the logo at `(0, 0)`** — the top-left corner.

- It collapses the math: with `x0 = y0 = 0` there are no offsets or congruences to
  solve, and the first corner is exactly `q * Tx`.
- It doubles as UX: the new logo visibly launches out of the corner, announcing the
  ownership change without a toast.
- The corner at `t = 0` is not counted; only `t > 0` corners register.

### 3.4 Persisting corner hits

`next_corner_at` is computed once, inside the takeover transaction. Corner hits are
persisted lazily: `/api/state` compares `now() > next_corner_at` and, if passed,
inserts the hit and advances the counter.

```sql
INSERT INTO corner_hits (identity_id, corner_index, hit_at)
VALUES ($1, $2, $3)
ON CONFLICT (identity_id, corner_index) DO NOTHING;
```

`corner_index = floor((now - physics_started_at) / (q * Tx))`. Idempotent under any
number of concurrent readers. No cron, no worker, no background job.

The client renders the effect locally the instant it computes a corner; the server
never trusts the client, so cheating the counter is impossible.

---

## 4. Data model

```sql
-- singleton, id = 1
game_state (
  id                     smallint primary key default 1,
  current_identity_id    uuid null references identities,
  current_bid_id         uuid null references bids,
  current_amount_cents   integer not null default 0,
  version                integer not null default 0,

  -- physics, derived from the winning bid's seed
  physics_started_at     timestamptz not null,
  phys_p                 integer not null,
  phys_q                 integer not null,
  next_corner_at         timestamptz not null,

  -- anti-outbid reservation
  reserved_amount_cents  integer null,
  reserved_until         timestamptz null,

  speed_multiplier       numeric not null default 1,
  addons                 jsonb not null default '{}',
  updated_at             timestamptz not null
)

identities (
  id            uuid primary key,
  identity_type text not null,          -- 'x' | 'website'
  identity_key  text not null unique,   -- 'x:levelsio' | 'website:fiber.so'
  source_url    text not null,          -- click destination (+ utm_source)
  display_name  text not null,
  description   text null,
  image_url     text not null,          -- hotlinked third-party URL (D4)
  user_id       uuid null,              -- unused; Neon Auth discarded
  email         text not null,
  status        text not null,          -- pending|active|replaced|rejected|outbid
  view_count    integer not null default 0,   -- denormalized from identity_views
  click_count   integer not null default 0,
  corner_count  integer not null default 0,   -- denormalized from corner_hits
  seconds_held  integer not null default 0,
  created_at    timestamptz not null
)

bids (
  id                   uuid primary key,
  identity_id          uuid not null references identities,
  quoted_amount_cents  integer not null,
  paid_amount_cents    integer null,
  addons               jsonb not null default '{}',
  expected_version     integer not null,
  seed                 bigint not null,       -- picks (p, q) from the table
  rail                  text not null,  -- 'polar' | 'mercadopago'
  rail_intent_id        text,           -- checkout session / preference id
  rail_authorization_id text,           -- Mercado Pago only; Polar captures on the spot
  rail_payment_id       text,           -- settled payment / order id
  status               text not null,  -- created|pending|settled|applied|unwound|expired
  unique (rail, rail_intent_id),
  created_at, paid_at, applied_at timestamptz
)

payments (
  id             uuid primary key,
  rail           text not null,          -- 'polar' | 'mercadopago'
  rail_event_id  text not null,          -- webhook idempotency, unique per rail
  bid_id         uuid references bids,
  amount_cents   integer not null,
  currency       text not null,
  raw            jsonb not null,
  created_at     timestamptz not null,
  unique (rail, rail_event_id)
)

-- one row per session per holder; the ranking reads the denormalized counter
identity_views (
  identity_id  uuid not null references identities,
  session_id   text not null,
  first_seen   timestamptz not null,
  primary key (identity_id, session_id)
)

corner_hits (
  id            uuid primary key,
  identity_id   uuid not null references identities,
  bid_id        uuid not null references bids,
  corner_index  integer not null,
  hit_at        timestamptz not null,
  unique (identity_id, corner_index)
)

moderation_events (id, identity_id, action, reason, created_at)
```

Indexes: `bids(rail, rail_intent_id)`, `bids(status)`, `identities(status)`,
`identities(view_count desc)`,
`identities(identity_key)`, `corner_hits(hit_at desc)`.

---

## 5. Bid flow

```
[single input]   @levelsio   |   fiber.so
      | POST /api/resolve-identity      (debounced, nothing persisted)
[preview: image + displayName + amount to pay]
      | POST /api/checkout        (reserve slot, rail.createIntent)
[hosted checkout: Polar or Mercado Pago]
      | webhook -> rail.verify() -> SettlementEvent
      |   1. atomic takeover UPDATE ... WHERE version = expected_version
      |   2. rail.settle(bid, won ? 'won' : 'lost')
      |        Mercado Pago: capture / cancel   (loser never charged)
      |        Polar:        already captured / refund
      |
[/success]   won   |   outbid (refunded, or never charged on MP)
```

### 5.1 Identity resolution

```
x:<handle>     -> https://unavatar.io/x/<handle>
website:<dom>  -> fetch HTML, pick by priority:
                  og:image > apple-touch-icon > link[rel=icon] > /favicon.ico
                  displayName from og:title, description from og:description
```

SSRF guard on the website path — the server fetches a user-supplied URL:
- http/https only
- resolve DNS and reject private, loopback and link-local ranges
- 5s timeout, 5MB cap
- re-validate the target of every redirect against the same rules

Normalize `identity_key` aggressively (lowercase, strip `www.`, strip trailing
slash, strip `@`) so `fiber.so` and `https://www.Fiber.so/` collapse to one key.

### 5.2 Reservation

```sql
UPDATE game_state SET
  reserved_amount_cents = $quoted,
  reserved_until        = now() + interval '5 minutes'
WHERE id = 1
  AND (reserved_until IS NULL OR reserved_until < now())
  AND $quoted > current_amount_cents;
-- 0 rows -> "someone is bidding right now, try again in 5 minutes"
```

Abuse controls: one active reservation per email, rate limit per IP, 5-minute expiry.

### 5.3 Takeover

Single conditional UPDATE inside a transaction. If `version` moved between checkout
and webhook, zero rows are affected and the bid is marked `outbid`.

```sql
UPDATE game_state SET
  current_identity_id  = $identityId,
  current_bid_id       = $bidId,
  current_amount_cents = $paid,
  version              = version + 1,
  physics_started_at   = now(),
  phys_p = $p, phys_q = $q,
  next_corner_at       = now() + ($q * $Tx) * interval '1 second',
  reserved_amount_cents = NULL,
  reserved_until        = NULL
WHERE id = 1 AND version = $expectedVersion AND $paid > current_amount_cents;
```

On zero rows: `bid.status = 'unwound'` and `rail.settle(bid, 'lost')`. On Mercado Pago
that cancels an authorization the buyer never paid; on Polar it issues a refund.

---

## 6. Payments

Two rails behind one interface. The rail is chosen per bid and recorded on it, so a
bid is always settled through the rail that created it.

```ts
export interface PaymentRail {
  readonly name: 'polar' | 'mercadopago';

  /** Create the hosted checkout the buyer is redirected to. */
  createIntent(bid: Bid): Promise<{ intentId: string; redirectUrl: string }>;

  /** Verify an inbound webhook and normalize it. Returns null if not settlement. */
  verify(req: Request): Promise<SettlementEvent | null>;

  /** Called after the takeover UPDATE. Captures on win, unwinds on loss. */
  settle(bid: Bid, outcome: 'won' | 'lost'): Promise<void>;
}
```

Everything downstream — the reservation, the atomic takeover, the physics reset — is
rail-agnostic. Only `settle` differs, and the difference is real:

| | Polar | Mercado Pago |
|---|---|---|
| Coverage | Global | Argentina |
| Authorization hold | No — captures immediately | Yes — `capture: false` |
| Losing an outbid | Refund after the fact | Cancel before any charge |
| Buyer sees a charge when they lose | Yes, then a refund | No |

Mercado Pago supports the same two-phase settlement PayPal did: create the payment
with `capture: false`, then capture or cancel once the takeover resolves. Polar
captures on checkout, so a lost bid there means a real refund and a real line on the
buyer's statement. That asymmetry is worth surfacing in the UI — Argentine buyers get
a strictly better outbid experience.

### 6.1 Webhook handling

Each rail posts to its own route (`/api/webhooks/polar`, `/api/webhooks/mercadopago`),
verifies its own signature, and normalizes into the same `SettlementEvent`. From there
a single shared handler runs the takeover.

Idempotency is `unique (rail, rail_event_id)` on `payments`. Replaying any event from
either provider is a no-op.

Fulfillment happens on the webhook, never on the return URL — the buyer can pay and
close the tab before `/success` loads.

### 6.2 Amount handling

Store integer cents everywhere; convert only at the rail boundary. Polar takes cents
directly. Mercado Pago takes a decimal amount and a currency of `ARS`, which means
bids priced in USD need a conversion at intent-creation time, frozen onto the bid so
the displayed price and the charged price cannot drift.

Environment:

```
DATABASE_URL                    # Neon pooled, prepare: false
POLAR_ACCESS_TOKEN
POLAR_WEBHOOK_SECRET
POLAR_PRODUCT_ID
POLAR_SERVER                    # sandbox | production
MP_ACCESS_TOKEN                 # Checkout Pro private key (skill name)
MP_PUBLIC_KEY                   # Checkout Pro public key (unused for redirect)
MP_WEBHOOK_SECRET               # webhook Secret signature
MP_USD_ARS_RATE                 # ARS per 1 USD, frozen per preference
NEXT_PUBLIC_APP_URL
ADMIN_EMAILS
```

## 7. Rendering and realtime

**The logo is a DOM `<img>`, not a canvas.** Moved with
`transform: translate3d(x, y, 0)` inside `requestAnimationFrame`.

- Runs on the GPU compositor, off the main thread.
- Avoids tainted-canvas problems: drawing a cross-origin image without CORS headers
  taints a canvas. A plain `<img>` has no such issue — and with hotlinked images (D4)
  CORS headers are never guaranteed.
- Canvas would only pay off with many logos. There is exactly one.

Do **not** route the logo through `next/image`. `remotePatterns: ['**']` turns
`/_next/image` into an open image-optimization proxy that anyone can bill to your
Vercel account. Serve the raw `<img>`.

Realtime is **polling every 2s** against `/api/state`, `Cache-Control: no-store`.
Because physics is deterministic, the client needs no positional updates — only to
learn that `version` changed. The payload is tiny. SSE is a v1.1 concern.

### 7.1 Clock skew

Deterministic physics guarantees every viewer sees the same position at the same
instant **only if they agree on what instant it is**. A client whose system clock is
minutes off computes a completely different position, and the shared-experience
property silently breaks for that person.

`/api/state` therefore returns `serverNow`. The client derives
`offset = serverNow - clientNow` on each poll, smooths it (a skewed sample under load
should not jerk the logo), and feeds `Date.now() + offset` into `positionAt`.

Everything is computed from *elapsed time since `physics_started_at`*, so only the
offset matters, never absolute clock correctness.

---

## 8. Analytics and ranking

The public ranking is part of the product, not a dashboard. It reads on every page
render, so the numbers live in Postgres as denormalized counters on `identities`.

**Clicks per hour.** `identity_clicks` stores one row per click with a timestamp.
A denormalized counter can give a lifetime total but never a rate, and the rate is
what sells the slot: "922 clicks/h" says traffic is happening *now*, while "4254
clicks" could be from three weeks ago. `identities.click_count` remains as the cheap
lifetime total.

**Views.** One row per `(identity_id, session_id)` in `identity_views`, where
`session_id` is a client-generated id persisted in `localStorage`. Inserted with
`ON CONFLICT DO NOTHING` — the same pattern as `corner_hits`, and idempotent for the
same reason. The insert bumps `identities.view_count` only when it actually inserts,
so a viewer refreshing the page fifty times still counts once.

**Clicks.** The holder's link goes through `/go/:identityId`, which increments
`click_count` and 302s to `source_url` with `utm_source`. Server-side, so it cannot be
inflated from the client and cannot be blocked by an ad blocker.

**Corner hits and time held** come from `corner_hits` and the takeover timestamps.

The ranking lists every past holder with amount paid, views, clicks, corners hit and
time held. The current holder pins to the top. This doubles as the pitch to the next
bidder: concrete numbers on what the slot actually delivered.

PostHog, if wanted, stays a separate concern for product analytics — funnel, drop-off,
conversion. It never backs anything the site renders.

---

## 9. Moderation and abuse

- Admin kill switch: `rejected` removes the identity and restores the previous
  holder, or the CornerBid placeholder. Target: under 1 minute. This is the primary
  mitigation for the hotlink risk in D4.
- Blocklist on words and domains, checked at resolve time.
- Rate limit `/api/checkout` and `/api/resolve-identity` per IP and per email.
- Minimum increment: current + 100 cents.
- Per-checkout cap ($500). Both rails run their own fraud screening on the buyer side.
  On Mercado Pago a rejected takeover never becomes a charge at all.
- Terms: the bidder warrants trademark rights; 24h takedown.

---

## 10. Implementation order

1. Drizzle schema + Neon migration + singleton seed
2. `lib/physics.ts` — coprime table, `solveCorner`, shared client/server position fn
3. Deterministic renderer + static overlays
4. `/api/state` + 2s polling + lazy corner-hit persistence
5. `/api/resolve-identity` with SSRF guard + bid modal
6. PaymentRail interface + PolarRail + webhook + atomic takeover + settle
7. `/success` (won / outbid) + clock-skew correction
7b. View/click counters and the public ranking
8. ~~Neon Auth~~ **discarded** — identity is URL / @handle
9. Rate limiting, moderation, terms
10. MercadoPagoRail Checkout Pro + webhook signature + AR routing

---

## 11. Acceptance criteria

1. With $0 in the slot, a $1 payment installs the logo.
2. With a holder at $247, a confirmed $248 webhook replaces it.
3. A $248 order approved after a $249 already applied does not take over: the
   bid is unwound. Polar and Checkout Pro **refund**; there is no authorization
   hold on Checkout Pro (Bricks would be required for `capture: false`).
4. Reloading the page duplicates neither the logo nor the charge.
5. Two viewers in different browsers see the same holder and a coherent trajectory
   derived from the same `physics_started_at`.
6. A corner hit increments the counter exactly once, regardless of viewer count.
7. `@levelsio` and `levelsio` and `https://x.com/levelsio` all resolve to the single
   key `x:levelsio`.
8. An offensive listing can be taken down from admin in under a minute.
9. Replaying any webhook from either rail is a no-op (unique on `(rail, rail_event_id)`).

---

## 12. Payment processor constraints

Recorded because it drove D6 and will resurface if the processor is ever revisited.

**Polar rejected this use case.** Their AUP lists under prohibited products:
"Donations, crowdfunding, community access, **advertising, and sponsorship**". Their
Merchant of Record docs name the exact pattern: "They often sell premium placement,
i.e ads... Or even where it's their sole purpose to sell placement."

The rejection is about the **product category**, not the game mechanic. This matters
because it generalizes: Creem, Lemon Squeezy and Paddle are all built for software and
SaaS and treat advertising as a separate, excluded category. Moving between indie MoRs
does not solve it.

Note that outbid.lol itself runs on Polar (`polarOrderId` and `polarCheckoutId` appear
in their payload — see appendix). Either they were approved before the policy tightened
or they are operating in a grey area. It is not precedent to rely on.

**Stripe** was ruled out for lack of a US entity, not for policy reasons.

**PayPal** carries no category restriction and was the intended rail, but account
creation could not be completed.

**Current position, stated plainly.** The project ships on Polar despite the rejection,
on the reasoning that outbid.lol operates the same way on the same provider. This is an
accepted business risk, not an oversight. The concrete exposure: if Polar reviews and
closes the account, in-flight balances are held and payouts stop — and that review is
most likely to happen exactly when volume spikes.

Two mitigations are in the design rather than in hope:

1. **`PaymentRail` is an interface, not an integration.** Replacing Polar touches one
   module. Schema, physics, reservation and takeover are untouched.
2. **Mercado Pago is a real second rail, not a fallback stub.** Bringing it up before
   volume arrives means there is somewhere to route if the first rail stops.

Never describe the product as something other than what it is during onboarding. A
mismatch found during review is what escalates a category problem into a 180-day
fund hold.

---

## Appendix: reference payload from outbid.lol

Captured 2026-08-21 from the RSC payload. Confirms the namespaced identity model and
that they hotlink advertiser favicons.

```json
{
  "identityType": "website",
  "identityKey": "website:fiber.so",
  "sourceUrl": "https://fiber.so/",
  "displayName": "The private wallet for your stablecoins.",
  "imageUrl": "https://fiber.so/favicon.ico?favicon.3z_89op00alwy.ico",
  "amountCents": 102900,
  "clickCount": 86
}
```

Observed `identityKey` namespaces: `website:` (60 entries) and `x:` (`x:levelsio`,
`x:cab`, `x:jonathan_wilke`, ...). Several entries carry `"imageUrl": null` and fall
back to a letter avatar — acceptable in a text ranking, fatal on a screen where the
logo is the product. Noted as accepted risk under D4.
