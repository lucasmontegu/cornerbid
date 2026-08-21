CREATE TABLE "identity_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"bid_id" uuid,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text
);
--> statement-breakpoint
ALTER TABLE "identity_clicks" ADD CONSTRAINT "identity_clicks_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_clicks" ADD CONSTRAINT "identity_clicks_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "identity_clicks_clicked_at_idx" ON "identity_clicks" USING btree ("clicked_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "identity_clicks_identity_time_idx" ON "identity_clicks" USING btree ("identity_id","clicked_at" DESC NULLS LAST);