CREATE TABLE IF NOT EXISTS "session_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "surf_sessions"("id") ON DELETE CASCADE,
  "photo_url" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Migrate existing single photoUrl to session_photos table
INSERT INTO "session_photos" ("session_id", "photo_url", "sort_order")
SELECT "id", "photo_url", 0
FROM "surf_sessions"
WHERE "photo_url" IS NOT NULL;
