ALTER TABLE "spot_alerts" ADD COLUMN "sms_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_enabled" boolean DEFAULT false NOT NULL;