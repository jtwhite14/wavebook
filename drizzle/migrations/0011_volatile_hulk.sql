CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "condition_profiles" ADD COLUMN "consistency" varchar(10) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "condition_profiles" ADD COLUMN "quality_ceiling" integer DEFAULT 3 NOT NULL;