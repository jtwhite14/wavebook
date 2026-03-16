ALTER TABLE "condition_profiles" ADD COLUMN "weight_swell_height" decimal(3,2) NOT NULL DEFAULT 0.80;
ALTER TABLE "condition_profiles" ADD COLUMN "weight_swell_period" decimal(3,2) NOT NULL DEFAULT 0.70;
ALTER TABLE "condition_profiles" ADD COLUMN "weight_swell_direction" decimal(3,2) NOT NULL DEFAULT 0.90;
ALTER TABLE "condition_profiles" ADD COLUMN "weight_tide_height" decimal(3,2) NOT NULL DEFAULT 0.50;
ALTER TABLE "condition_profiles" ADD COLUMN "weight_wind_speed" decimal(3,2) NOT NULL DEFAULT 0.70;
ALTER TABLE "condition_profiles" ADD COLUMN "weight_wind_direction" decimal(3,2) NOT NULL DEFAULT 0.60;
ALTER TABLE "condition_profiles" ADD COLUMN "weight_wave_energy" decimal(3,2) NOT NULL DEFAULT 0.80;
