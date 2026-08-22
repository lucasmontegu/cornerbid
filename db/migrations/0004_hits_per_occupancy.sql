-- Hits are per occupancy, not per identity. The same URL can take the slot
-- again and keep adding to its lifetime total.
ALTER TABLE "corner_hits" DROP CONSTRAINT IF EXISTS "corner_hits_identity_index_unique";--> statement-breakpoint
ALTER TABLE "corner_hits" ADD CONSTRAINT "corner_hits_bid_index_unique" UNIQUE ("bid_id", "corner_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corner_hits_identity_idx" ON "corner_hits" ("identity_id");
