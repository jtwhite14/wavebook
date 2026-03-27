-- Enable Row Level Security on all public tables
-- The app uses Drizzle ORM (direct DB connection) and Supabase service_role key,
-- both of which bypass RLS. This migration secures tables against unauthorized
-- access via the PostgREST anon key.

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."surf_spots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."surf_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_conditions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."surfboards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."wetsuits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."spot_forecasts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."spot_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."condition_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."spot_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."upload_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."upload_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."condition_history_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;
