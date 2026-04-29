ALTER TABLE "quotes" ADD COLUMN "share_token" uuid;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "shared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "customer_responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "emailed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "emailed_to" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_share_token_unique" UNIQUE("share_token");