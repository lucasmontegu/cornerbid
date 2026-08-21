ALTER TABLE "bids" ADD COLUMN "charge_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "identities" ADD COLUMN "paid_total_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE identities AS i SET paid_total_cents = COALESCE((
  SELECT MAX(COALESCE(b.paid_amount_cents, b.quoted_amount_cents))
  FROM bids AS b
  WHERE b.identity_id = i.id AND b.status IN ('applied', 'settled')
), 0)
WHERE i.paid_total_cents = 0;