CREATE TYPE "public"."bid_status" AS ENUM('created', 'pending', 'settled', 'applied', 'unwound', 'expired');--> statement-breakpoint
CREATE TYPE "public"."identity_status" AS ENUM('pending', 'active', 'replaced', 'rejected', 'outbid');--> statement-breakpoint
CREATE TYPE "public"."identity_type" AS ENUM('x', 'website');--> statement-breakpoint
CREATE TYPE "public"."moderation_action" AS ENUM('rejected', 'restored', 'banned');--> statement-breakpoint
CREATE TYPE "public"."payment_rail" AS ENUM('polar', 'mercadopago', 'house');--> statement-breakpoint
CREATE TABLE "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"quoted_amount_cents" integer NOT NULL,
	"paid_amount_cents" integer,
	"addons" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expected_version" integer NOT NULL,
	"seed" bigint NOT NULL,
	"rail" "payment_rail" NOT NULL,
	"rail_intent_id" text,
	"rail_authorization_id" text,
	"rail_payment_id" text,
	"status" "bid_status" DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	CONSTRAINT "bids_rail_intent_unique" UNIQUE("rail","rail_intent_id")
);
--> statement-breakpoint
CREATE TABLE "corner_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"bid_id" uuid NOT NULL,
	"corner_index" integer NOT NULL,
	"hit_at" timestamp with time zone NOT NULL,
	"viewers_approx" integer,
	CONSTRAINT "corner_hits_identity_index_unique" UNIQUE("identity_id","corner_index")
);
--> statement-breakpoint
CREATE TABLE "game_state" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"current_identity_id" uuid,
	"current_bid_id" uuid,
	"current_amount_cents" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"physics_started_at" timestamp with time zone NOT NULL,
	"phys_p" integer NOT NULL,
	"phys_q" integer NOT NULL,
	"next_corner_at" timestamp with time zone NOT NULL,
	"reserved_amount_cents" integer,
	"reserved_until" timestamp with time zone,
	"speed_multiplier" numeric(4, 2) DEFAULT '1' NOT NULL,
	"addons" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_state_singleton" CHECK ("game_state"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_type" "identity_type" NOT NULL,
	"identity_key" text NOT NULL,
	"source_url" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"status" "identity_status" DEFAULT 'pending' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"corner_count" integer DEFAULT 0 NOT NULL,
	"seconds_held" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identities_identity_key_unique" UNIQUE("identity_key")
);
--> statement-breakpoint
CREATE TABLE "identity_views" (
	"identity_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_views_identity_id_session_id_pk" PRIMARY KEY("identity_id","session_id")
);
--> statement-breakpoint
CREATE TABLE "moderation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" uuid NOT NULL,
	"action" "moderation_action" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rail" "payment_rail" NOT NULL,
	"rail_event_id" text NOT NULL,
	"bid_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_rail_event_unique" UNIQUE("rail","rail_event_id")
);
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corner_hits" ADD CONSTRAINT "corner_hits_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corner_hits" ADD CONSTRAINT "corner_hits_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_state" ADD CONSTRAINT "game_state_current_identity_id_identities_id_fk" FOREIGN KEY ("current_identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_state" ADD CONSTRAINT "game_state_current_bid_id_bids_id_fk" FOREIGN KEY ("current_bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_views" ADD CONSTRAINT "identity_views_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_events" ADD CONSTRAINT "moderation_events_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bids_status_idx" ON "bids" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bids_identity_idx" ON "bids" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "bids_created_at_idx" ON "bids" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "corner_hits_hit_at_idx" ON "corner_hits" USING btree ("hit_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "identities_status_idx" ON "identities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "identities_view_count_idx" ON "identities" USING btree ("view_count" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "identities_email_idx" ON "identities" USING btree ("email");--> statement-breakpoint
CREATE INDEX "moderation_events_identity_idx" ON "moderation_events" USING btree ("identity_id");--> statement-breakpoint
CREATE INDEX "payments_bid_idx" ON "payments" USING btree ("bid_id");