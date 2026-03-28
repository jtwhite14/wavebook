import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const TEST_USER_EMAIL = "demo@wavebook.test";

const MARINE_API_BASE = "https://marine-api.open-meteo.com/v1/marine";
const HISTORICAL_API_BASE = "https://archive-api.open-meteo.com/v1/era5";

const MARINE_PARAMS = [
  "wave_height", "wave_period", "wave_direction",
  "swell_wave_height", "swell_wave_period", "swell_wave_direction",
  "secondary_swell_wave_height", "secondary_swell_wave_period", "secondary_swell_wave_direction",
  "wind_wave_height", "wind_wave_period", "wind_wave_direction",
].join(",");

interface Conditions {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  primarySwellHeight: number | null;
  primarySwellPeriod: number | null;
  primarySwellDirection: number | null;
  secondarySwellHeight: number | null;
  secondarySwellPeriod: number | null;
  secondarySwellDirection: number | null;
  windWaveHeight: number | null;
  windWavePeriod: number | null;
  windWaveDirection: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGust: number | null;
  airTemp: number | null;
  seaSurfaceTemp: number | null;
  humidity: number | null;
  precipitation: number | null;
  pressureMsl: number | null;
  cloudCover: number | null;
  visibility: number | null;
  tideHeight: number | null;
  timestamp: Date;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a random date within the last ~6 months, with a believable surf start time (5am-10am local). */
function randomSurfDate(): Date {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const rangeMs = now.getTime() - sixMonthsAgo.getTime();
  const randomMs = Math.random() * rangeMs;
  const date = new Date(sixMonthsAgo.getTime() + randomMs);

  // Set a believable surf session start time: 5:00 AM - 10:00 AM (Pacific-ish)
  // Store as UTC, so 5am PT = 13:00 UTC, 10am PT = 18:00 UTC
  const hour = randomInt(13, 18);
  const minute = randomInt(0, 3) * 15; // 0, 15, 30, or 45
  date.setUTCHours(hour, minute, 0, 0);

  return date;
}

/** Generate a believable end time: 1-3 hours after start. */
function randomEndTime(start: Date): Date {
  const durationMinutes = randomInt(60, 180);
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

async function fetchHistorical(lat: number, lng: number, date: Date): Promise<Conditions | null> {
  const dateStr = date.toISOString().split("T")[0];

  const marineParams = new URLSearchParams({
    latitude: lat.toString(), longitude: lng.toString(),
    start_date: dateStr, end_date: dateStr,
    hourly: MARINE_PARAMS, timezone: "auto",
  });

  const weatherParams = new URLSearchParams({
    latitude: lat.toString(), longitude: lng.toString(),
    start_date: dateStr, end_date: dateStr,
    hourly: [
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      "temperature_2m", "sea_surface_temperature",
      "relative_humidity_2m", "precipitation", "pressure_msl",
      "cloud_cover", "visibility",
    ].join(","),
    timezone: "auto",
  });

  try {
    const [marineRes, weatherRes] = await Promise.all([
      fetch(`${MARINE_API_BASE}?${marineParams}`),
      fetch(`${HISTORICAL_API_BASE}?${weatherParams}`),
    ]);

    if (!marineRes.ok && !weatherRes.ok) return null;

    const marine = marineRes.ok ? await marineRes.json() : null;
    const weather = weatherRes.ok ? await weatherRes.json() : null;

    const times: string[] = marine?.hourly?.time || weather?.hourly?.time || [];
    if (times.length === 0) return null;

    const targetHour = date.getUTCHours();
    let closestIndex = 0;
    let minDiff = Infinity;
    times.forEach((time: string, index: number) => {
      const diff = Math.abs(new Date(time).getUTCHours() - targetHour);
      if (diff < minDiff) { minDiff = diff; closestIndex = index; }
    });

    return {
      waveHeight: marine?.hourly?.wave_height?.[closestIndex] ?? null,
      wavePeriod: marine?.hourly?.wave_period?.[closestIndex] ?? null,
      waveDirection: marine?.hourly?.wave_direction?.[closestIndex] ?? null,
      primarySwellHeight: marine?.hourly?.swell_wave_height?.[closestIndex] ?? null,
      primarySwellPeriod: marine?.hourly?.swell_wave_period?.[closestIndex] ?? null,
      primarySwellDirection: marine?.hourly?.swell_wave_direction?.[closestIndex] ?? null,
      secondarySwellHeight: marine?.hourly?.secondary_swell_wave_height?.[closestIndex] ?? null,
      secondarySwellPeriod: marine?.hourly?.secondary_swell_wave_period?.[closestIndex] ?? null,
      secondarySwellDirection: marine?.hourly?.secondary_swell_wave_direction?.[closestIndex] ?? null,
      windWaveHeight: marine?.hourly?.wind_wave_height?.[closestIndex] ?? null,
      windWavePeriod: marine?.hourly?.wind_wave_period?.[closestIndex] ?? null,
      windWaveDirection: marine?.hourly?.wind_wave_direction?.[closestIndex] ?? null,
      windSpeed: weather?.hourly?.wind_speed_10m?.[closestIndex] ?? null,
      windDirection: weather?.hourly?.wind_direction_10m?.[closestIndex] ?? null,
      windGust: weather?.hourly?.wind_gusts_10m?.[closestIndex] ?? null,
      airTemp: weather?.hourly?.temperature_2m?.[closestIndex] ?? null,
      seaSurfaceTemp: weather?.hourly?.sea_surface_temperature?.[closestIndex] ?? null,
      humidity: weather?.hourly?.relative_humidity_2m?.[closestIndex] ?? null,
      precipitation: weather?.hourly?.precipitation?.[closestIndex] ?? null,
      pressureMsl: weather?.hourly?.pressure_msl?.[closestIndex] ?? null,
      cloudCover: weather?.hourly?.cloud_cover?.[closestIndex] ?? null,
      visibility: weather?.hourly?.visibility?.[closestIndex] ?? null,
      tideHeight: null,
      timestamp: new Date(times[closestIndex]),
    };
  } catch {
    return null;
  }
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL or DIRECT_URL set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  // Find test user
  const testUser = await db.query.users.findFirst({
    where: eq(schema.users.email, TEST_USER_EMAIL),
    columns: { id: true },
  });

  if (!testUser) {
    console.error("Test user not found");
    await client.end();
    process.exit(1);
  }

  console.log(`Test user ID: ${testUser.id}`);

  // Get all test user sessions with spots and conditions
  const sessions = await db.query.surfSessions.findMany({
    where: eq(schema.surfSessions.userId, testUser.id),
    with: { conditions: true, spot: true },
  });

  console.log(`Found ${sessions.length} test sessions to randomize\n`);

  if (sessions.length === 0) {
    await client.end();
    return;
  }

  // Generate unique random dates, sorted chronologically
  const dates = sessions.map(() => randomSurfDate()).sort((a, b) => a.getTime() - b.getTime());

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const newDate = dates[i];
    const newEnd = randomEndTime(newDate);

    if (!s.spot) {
      console.log(`  Skip ${s.id}: no spot`);
      failed++;
      continue;
    }

    const lat = parseFloat(s.spot.latitude);
    const lng = parseFloat(s.spot.longitude);

    console.log(`  [${i + 1}/${sessions.length}] ${s.spot.name} → ${newDate.toISOString().split("T")[0]} ${newDate.toISOString().split("T")[1].slice(0, 5)} UTC`);

    // Update session date/times
    await db.update(schema.surfSessions).set({
      date: newDate,
      startTime: newDate,
      endTime: newEnd,
      updatedAt: new Date(),
    }).where(eq(schema.surfSessions.id, s.id));

    // Fetch real historical conditions for the new date
    const conditions = await fetchHistorical(lat, lng, newDate);

    if (!conditions) {
      console.log(`    ⚠ No conditions available for this date`);
      failed++;
      continue;
    }

    const values = {
      waveHeight: conditions.waveHeight?.toString() || null,
      wavePeriod: conditions.wavePeriod?.toString() || null,
      waveDirection: conditions.waveDirection?.toString() || null,
      primarySwellHeight: conditions.primarySwellHeight?.toString() || null,
      primarySwellPeriod: conditions.primarySwellPeriod?.toString() || null,
      primarySwellDirection: conditions.primarySwellDirection?.toString() || null,
      secondarySwellHeight: conditions.secondarySwellHeight?.toString() || null,
      secondarySwellPeriod: conditions.secondarySwellPeriod?.toString() || null,
      secondarySwellDirection: conditions.secondarySwellDirection?.toString() || null,
      windWaveHeight: conditions.windWaveHeight?.toString() || null,
      windWavePeriod: conditions.windWavePeriod?.toString() || null,
      windWaveDirection: conditions.windWaveDirection?.toString() || null,
      windSpeed: conditions.windSpeed?.toString() || null,
      windDirection: conditions.windDirection?.toString() || null,
      windGust: conditions.windGust?.toString() || null,
      airTemp: conditions.airTemp?.toString() || null,
      seaSurfaceTemp: conditions.seaSurfaceTemp?.toString() || null,
      humidity: conditions.humidity?.toString() || null,
      precipitation: conditions.precipitation?.toString() || null,
      pressureMsl: conditions.pressureMsl?.toString() || null,
      cloudCover: conditions.cloudCover?.toString() || null,
      visibility: conditions.visibility?.toString() || null,
      tideHeight: conditions.tideHeight?.toString() || null,
      timestamp: conditions.timestamp,
    };

    if (s.conditions) {
      await db.update(schema.sessionConditions).set(values)
        .where(eq(schema.sessionConditions.sessionId, s.id));
    } else {
      await db.insert(schema.sessionConditions).values({ sessionId: s.id, ...values });
    }

    updated++;
    console.log(`    ✓ wave: ${conditions.waveHeight}m, wind: ${conditions.windSpeed}km/h, temp: ${conditions.airTemp}°C`);

    // Rate limit Open-Meteo
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed out of ${sessions.length}`);
  await client.end();
}

main().catch(console.error);
