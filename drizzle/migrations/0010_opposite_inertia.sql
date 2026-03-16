CREATE TABLE "spot_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"shared_by_user_id" uuid NOT NULL,
	"shared_with_user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"invite_code" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	CONSTRAINT "spot_shares_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
ALTER TABLE "spot_shares" ADD CONSTRAINT "spot_shares_spot_id_surf_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."surf_spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spot_shares" ADD CONSTRAINT "spot_shares_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spot_shares" ADD CONSTRAINT "spot_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_spot_shares_trio" ON "spot_shares" USING btree ("spot_id","shared_by_user_id","shared_with_user_id");--> statement-breakpoint
CREATE INDEX "idx_spot_shares_shared_with" ON "spot_shares" USING btree ("shared_with_user_id");