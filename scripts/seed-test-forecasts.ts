import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const TEST_USER_EMAIL = "demo@wavebook.test";

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function calculateWaveEnergy(height: number, period: number): number {
  return Math.round(0.5 * 1025 * 9.81 * height * height * period * 100) / 100;
}

/**
 * Generate 16 days of synthetic hourly forecast data that looks like a
 * realistic New England / Atlantic Canada surf forecast.
 *
 * We simulate a swell event peaking around day 2-3, fading by day 5,
 * with a secondary bump around day 8-9, and small background swell otherwise.
 */
function generateForecast(spotName: string, utcOffsetSeconds: number) {
  const now = new Date();
  // Round down to current hour
  now.setMinutes(0, 0, 0);

  const hourly: object[] = [];

  // Base swell characteristics per spot for variety
  const spotSeeds: Record<string, { baseDir: number; exposure: number; basePeriod: number }> = {
    "Tacky's":       { baseDir: 210, exposure: 0.9, basePeriod: 11 },
    "Pamola Point":  { baseDir: 195, exposure: 0.7, basePeriod: 10 },
    "Lolos":         { baseDir: 220, exposure: 0.8, basePeriod: 12 },
    "Rudy's Head":   { baseDir: 200, exposure: 1.0, basePeriod: 11 },
    "Deal":          { baseDir: 230, exposure: 0.85, basePeriod: 10 },
    "Tunnels":       { baseDir: 215, exposure: 0.6, basePeriod: 9 },
  };

  const seed = spotSeeds[spotName] ?? { baseDir: 210, exposure: 0.8, basePeriod: 10 };

  for (let h = 0; h < 384; h++) {
    const date = new Date(now.getTime() + h * 3600 * 1000);
    const localHour = (date.getUTCHours() + utcOffsetSeconds / 3600 + 24) % 24;
    const day = h / 24;

    // Swell envelope: primary event peaks day 2-3, secondary bump day 8-9
    const primaryEnvelope = Math.exp(-0.5 * ((day - 2.5) / 1.2) ** 2);
    const secondaryEnvelope = 0.6 * Math.exp(-0.5 * ((day - 8.5) / 1.5) ** 2);
    const swellEnvelope = Math.max(primaryEnvelope, secondaryEnvelope, 0.15); // background min

    // Swell height: 0.3m background up to ~1.8m peak, scaled by spot exposure
    const baseSwellHeight = (0.3 + swellEnvelope * 1.5) * seed.exposure;
    const swellHeight = parseFloat((baseSwellHeight + randomFloat(-0.1, 0.1)).toFixed(2));
    const swellPeriod = parseFloat((seed.basePeriod + swellEnvelope * 3 + randomFloat(-0.5, 0.5)).toFixed(1));
    const swellDir = parseFloat((seed.baseDir + randomFloat(-15, 15)).toFixed(0));

    // Secondary swell (smaller, different direction)
    const secSwellHeight = parseFloat((swellHeight * randomFloat(0.15, 0.35)).toFixed(2));
    const secSwellPeriod = parseFloat((randomFloat(5, 8)).toFixed(1));
    const secSwellDir = parseFloat(((seed.baseDir + 50 + randomFloat(-20, 20)) % 360).toFixed(0));

    // Wind: lighter in early morning, picks up midday, offshore (NW) early, onshore (S/SW) afternoon
    const morningCalm = Math.exp(-0.5 * ((localHour - 7) / 2) ** 2);
    const afternoonPick = Math.exp(-0.5 * ((localHour - 14) / 3) ** 2);
    const windBase = 5 + afternoonPick * 15 - morningCalm * 3;
    const windSpeed = parseFloat(Math.max(1, windBase + randomFloat(-3, 3)).toFixed(1));
    const windGust = parseFloat((windSpeed + randomFloat(3, 10)).toFixed(1));
    // Morning: NW (offshore ~320°), afternoon: SW (onshore ~210°)
    const windDir = parseFloat(((320 - afternoonPick * 110 + randomFloat(-20, 20) + 360) % 360).toFixed(0));

    // Wind waves
    const windWaveHeight = parseFloat((windSpeed * 0.015 + randomFloat(0, 0.1)).toFixed(2));
    const windWavePeriod = parseFloat((2 + windSpeed * 0.1 + randomFloat(0, 0.5)).toFixed(1));

    // Combined wave height
    const waveHeight = parseFloat(Math.sqrt(swellHeight ** 2 + windWaveHeight ** 2).toFixed(2));
    const wavePeriod = parseFloat((swellPeriod - 1 + randomFloat(-0.3, 0.3)).toFixed(1));
    const waveDir = swellDir;

    // Weather: cold Atlantic Canada late March
    const baseTemp = 2 + 4 * Math.sin((localHour - 6) * Math.PI / 12); // -2 to 6°C range
    const airTemp = parseFloat((baseTemp + randomFloat(-1, 1) + day * 0.1).toFixed(1)); // slow warming trend
    const seaSurfaceTemp = parseFloat((2 + randomFloat(-0.5, 0.5)).toFixed(1));

    // Tide: simple semidiurnal approximation
    const tidePhase = (h * 2 * Math.PI) / 12.42; // ~12.42 hour period
    const tideHeight = parseFloat((0.6 * Math.sin(tidePhase) + randomFloat(-0.05, 0.05)).toFixed(2));

    const isDay = localHour >= 6 && localHour <= 19;

    // Format time as local
    const localDate = new Date(date.getTime() + utcOffsetSeconds * 1000);
    const timeStr = localDate.toISOString().replace("Z", "").split(".")[0].slice(0, 16);

    hourly.push({
      time: timeStr,
      waveHeight,
      wavePeriod,
      waveDirection: waveDir,
      primarySwellHeight: swellHeight,
      primarySwellPeriod: swellPeriod,
      primarySwellDirection: swellDir,
      secondarySwellHeight: secSwellHeight,
      secondarySwellPeriod: secSwellPeriod,
      secondarySwellDirection: secSwellDir,
      windWaveHeight,
      windWavePeriod,
      windWaveDirection: windDir,
      windSpeed,
      windDirection: windDir,
      windGust,
      airTemp,
      seaSurfaceTemp,
      humidity: parseFloat((75 + randomFloat(-15, 15)).toFixed(0)),
      precipitation: parseFloat((Math.random() > 0.85 ? randomFloat(0.1, 1.5) : 0).toFixed(1)),
      pressureMsl: parseFloat((1015 + randomFloat(-8, 8) - primaryEnvelope * 5).toFixed(1)),
      cloudCover: parseFloat((40 + randomFloat(-30, 40)).toFixed(0)),
      visibility: parseFloat((30 + randomFloat(-15, 15)).toFixed(0)),
      tideHeight,
      waveEnergy: calculateWaveEnergy(swellHeight, swellPeriod),
      weatherCode: Math.random() > 0.7 ? (Math.random() > 0.5 ? 3 : 2) : (Math.random() > 0.5 ? 1 : 0),
      isDay,
      timestamp: date,
    });
  }

  return {
    hourly,
    utcOffsetSeconds,
    latitude: 54.7,
    longitude: -57.8,
    fetchedAt: new Date(),
  };
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL or DIRECT_URL set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  const testUser = await db.query.users.findFirst({
    where: eq(schema.users.email, TEST_USER_EMAIL),
    columns: { id: true },
  });

  if (!testUser) {
    console.error("Test user not found");
    await client.end();
    process.exit(1);
  }

  const spots = await db.query.surfSpots.findMany({
    where: eq(schema.surfSpots.userId, testUser.id),
  });

  console.log(`Generating synthetic forecasts for ${spots.length} test spots...\n`);

  // Atlantic time UTC-3 (NDT in summer, but late March is ADT = UTC-3)
  const utcOffsetSeconds = -3 * 3600;

  for (const spot of spots) {
    console.log(`  ${spot.name}...`);

    const forecast = generateForecast(spot.name, utcOffsetSeconds);

    await db.insert(schema.spotForecasts).values({
      spotId: spot.id,
      forecastData: forecast,
      fetchedAt: new Date(),
    }).onConflictDoUpdate({
      target: [schema.spotForecasts.spotId],
      set: { forecastData: forecast, fetchedAt: new Date() },
    });

    // Show peak swell
    const peak = forecast.hourly.reduce((best: { primarySwellHeight?: number }, h: { primarySwellHeight?: number }) =>
      (h.primarySwellHeight ?? 0) > (best.primarySwellHeight ?? 0) ? h : best
    ) as { primarySwellHeight: number; primarySwellPeriod: number; time: string };
    const peakFt = (peak.primarySwellHeight * 3.28084).toFixed(0);
    console.log(`    ✓ peak: ${peakFt}ft @ ${peak.primarySwellPeriod}s (${peak.time})`);
  }

  console.log("\nDone!");
  await client.end();
}

main().catch(console.error);
