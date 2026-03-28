import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const TEST_USER_EMAIL = "demo@wavebook.test";

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build a realistic forecastSnapshot for a coastal location */
function buildForecastSnapshot(lat: number) {
  const isNorthern = lat > 0;
  // March temps: cold in northern latitudes
  const baseAirTemp = isNorthern ? randomFloat(-2, 12) : randomFloat(15, 25);

  const swellHeight = randomFloat(0.6, 2.5);
  const swellPeriod = randomFloat(7, 16);
  const waveEnergy = 0.5 * 1025 * 9.81 * swellHeight * swellHeight * swellPeriod;

  return {
    waveHeight: parseFloat(randomFloat(0.5, 2.8).toFixed(2)),
    wavePeriod: parseFloat(randomFloat(6, 14).toFixed(1)),
    waveDirection: parseFloat(randomFloat(180, 300).toFixed(0)),
    primarySwellHeight: parseFloat(swellHeight.toFixed(2)),
    primarySwellPeriod: parseFloat(swellPeriod.toFixed(1)),
    primarySwellDirection: parseFloat(randomFloat(180, 310).toFixed(0)),
    secondarySwellHeight: Math.random() > 0.4 ? parseFloat(randomFloat(0.2, 0.8).toFixed(2)) : null,
    secondarySwellPeriod: Math.random() > 0.4 ? parseFloat(randomFloat(5, 10).toFixed(1)) : null,
    secondarySwellDirection: Math.random() > 0.4 ? parseFloat(randomFloat(150, 280).toFixed(0)) : null,
    windWaveHeight: parseFloat(randomFloat(0.1, 0.6).toFixed(2)),
    windWavePeriod: parseFloat(randomFloat(3, 6).toFixed(1)),
    windWaveDirection: parseFloat(randomFloat(180, 350).toFixed(0)),
    windSpeed: parseFloat(randomFloat(2, 25).toFixed(1)),
    windDirection: parseFloat(randomFloat(0, 360).toFixed(0)),
    windGust: parseFloat(randomFloat(5, 35).toFixed(1)),
    airTemp: parseFloat(baseAirTemp.toFixed(1)),
    seaSurfaceTemp: parseFloat((baseAirTemp + randomFloat(1, 5)).toFixed(1)),
    humidity: parseFloat(randomFloat(55, 95).toFixed(0)),
    precipitation: parseFloat((Math.random() > 0.7 ? randomFloat(0.1, 2) : 0).toFixed(1)),
    pressureMsl: parseFloat(randomFloat(1005, 1030).toFixed(1)),
    cloudCover: parseFloat(randomFloat(0, 100).toFixed(0)),
    visibility: parseFloat(randomFloat(10, 50).toFixed(0)),
    tideHeight: parseFloat(randomFloat(-0.5, 1.5).toFixed(2)),
    waveEnergy: parseFloat(waveEnergy.toFixed(1)),
    weatherCode: pick([0, 1, 2, 3, 45, 51, 61]),
    isDay: true,
    timestamp: new Date().toISOString(),
  };
}

/** Build realistic matchDetails for a session-based alert */
function buildMatchDetails(effectiveScore: number, daysOut: number, sessionRating: number) {
  // Higher effective scores need higher individual similarities
  const baseLevel = effectiveScore / 100;

  const forecastConfidence =
    daysOut <= 1 ? 1.0 :
    daysOut <= 2 ? 0.95 :
    daysOut <= 3 ? 0.9 :
    daysOut <= 4 ? 0.8 :
    daysOut <= 5 ? 0.7 : 0.5;

  const ratingBoost =
    sessionRating === 5 ? 1.0 :
    sessionRating === 4 ? 0.95 : 0.85;

  // Generate individual variable similarities that produce the right weighted score
  const genSim = () => parseFloat(Math.min(1, Math.max(0.2, baseLevel + randomFloat(-0.15, 0.15))).toFixed(2));

  return {
    swellHeight: genSim(),
    swellPeriod: genSim(),
    swellDirection: genSim(),
    tideHeight: genSim(),
    windSpeed: genSim(),
    windDirection: genSim(),
    waveEnergy: genSim(),
    coverage: parseFloat(randomFloat(0.71, 1.0).toFixed(3)),
    ratingBoost,
    forecastConfidence,
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

  // Get test user's spots
  const spots = await db.query.surfSpots.findMany({
    where: eq(schema.surfSpots.userId, testUser.id),
  });

  console.log(`Found ${spots.length} spots\n`);

  if (spots.length === 0) {
    console.log("No spots found for test user. Nothing to do.");
    await client.end();
    return;
  }

  // Get test user's sessions (to reference as matchedSessionId)
  const sessions = await db.query.surfSessions.findMany({
    where: eq(schema.surfSessions.userId, testUser.id),
  });

  console.log(`Found ${sessions.length} sessions to reference\n`);

  // Clear existing alerts for test user
  await db.delete(schema.spotAlerts).where(eq(schema.spotAlerts.userId, testUser.id));
  console.log("Cleared existing test alerts\n");

  const now = new Date();
  const timeWindows = ["dawn", "midday", "afternoon"] as const;
  let alertCount = 0;

  for (const spot of spots) {
    const lat = parseFloat(spot.latitude);
    const spotSessions = sessions.filter(s => s.spotId === spot.id);

    // Generate 3-8 alerts per spot, spread over the next 5 days
    const numAlerts = randomInt(3, 8);
    console.log(`${spot.name}: generating ${numAlerts} alerts...`);

    // Track used (day, timeWindow) combos for uniqueness
    const usedCombos = new Set<string>();

    for (let i = 0; i < numAlerts; i++) {
      const daysOut = randomInt(0, 4);
      const timeWindow = pick([...timeWindows]);
      const comboKey = `${daysOut}-${timeWindow}`;

      if (usedCombos.has(comboKey)) continue;
      usedCombos.add(comboKey);

      // Build the forecast hour
      const forecastDate = new Date(now);
      forecastDate.setDate(forecastDate.getDate() + daysOut);
      const windowHours = {
        dawn: randomInt(5, 8),
        midday: randomInt(9, 13),
        afternoon: randomInt(14, 19),
      };
      forecastDate.setHours(windowHours[timeWindow], 0, 0, 0);

      // Pick a matched session from this spot (if available)
      const matchedSession = spotSessions.length > 0 ? pick(spotSessions) : null;
      const sessionRating = matchedSession?.rating ?? pick([3, 4, 5]);

      // Generate scores - effective must be >= 70 to be a valid alert
      const matchScore = randomFloat(75, 97);
      const forecastConfidence =
        daysOut <= 1 ? 1.0 :
        daysOut <= 2 ? 0.95 :
        daysOut <= 3 ? 0.9 :
        daysOut <= 4 ? 0.8 : 0.7;
      const ratingBoost = sessionRating === 5 ? 1.0 : sessionRating === 4 ? 0.95 : 0.85;
      const confidenceScore = matchScore * forecastConfidence;
      const effectiveScore = matchScore * forecastConfidence * ratingBoost;

      // Only keep if effective score >= 70
      if (effectiveScore < 70) continue;

      const forecastSnapshot = buildForecastSnapshot(lat);
      const matchDetails = buildMatchDetails(effectiveScore, daysOut, sessionRating);

      await db.insert(schema.spotAlerts).values({
        spotId: spot.id,
        userId: testUser.id,
        forecastHour: forecastDate,
        timeWindow,
        matchScore: matchScore.toFixed(2),
        confidenceScore: confidenceScore.toFixed(2),
        effectiveScore: effectiveScore.toFixed(2),
        matchedSessionId: matchedSession?.id ?? null,
        matchedProfileId: null,
        matchDetails,
        forecastSnapshot,
        status: "active",
        expiresAt: forecastDate,
      });

      alertCount++;
      const scoreStr = effectiveScore.toFixed(0);
      const wave = forecastSnapshot.primarySwellHeight;
      const wind = forecastSnapshot.windSpeed;
      console.log(`  +${daysOut}d ${timeWindow.padEnd(9)} → ${scoreStr}% (wave: ${wave}m, wind: ${wind}km/h, rating: ${sessionRating}★)`);
    }
  }

  console.log(`\nDone: created ${alertCount} alerts across ${spots.length} spots`);
  await client.end();
}

main().catch(console.error);
