import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const MARINE_API_BASE = "https://marine-api.open-meteo.com/v1/marine";
const HISTORICAL_API_BASE = "https://archive-api.open-meteo.com/v1/era5";
const NDBC_STATION_TABLE_URL = "https://www.ndbc.noaa.gov/data/stations/station_table.txt";
const NDBC_HISTORICAL_URL = "https://www.ndbc.noaa.gov/view_text_file.php";

const MARINE_PARAMS = [
  "wave_height", "wave_period", "wave_direction",
  "swell_wave_height", "swell_wave_period", "swell_wave_direction",
  "secondary_swell_wave_height", "secondary_swell_wave_period", "secondary_swell_wave_direction",
  "wind_wave_height", "wind_wave_period", "wind_wave_direction",
].join(",");

const WEATHER_PARAMS = [
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
  "temperature_2m", "relative_humidity_2m", "precipitation",
  "pressure_msl", "cloud_cover", "visibility",
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

// ── NDBC buoy fallback for pre-Oct 2021 wave data ──

interface NdbcStation { id: string; lat: number; lng: number }
interface NdbcObs { waveHeight: number | null; dominantPeriod: number | null; meanWaveDirection: number | null; time: Date }

let ndbcStations: NdbcStation[] | null = null;
const ndbcCache = new Map<string, NdbcObs[]>();

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getNdbcStations(): Promise<NdbcStation[]> {
  if (ndbcStations) return ndbcStations;
  try {
    const res = await fetch(NDBC_STATION_TABLE_URL);
    if (!res.ok) return [];
    const text = await res.text();
    const stations: NdbcStation[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      const parts = line.split("|");
      if (parts.length < 7) continue;
      const id = parts[0].trim();
      const loc = parts[6].trim();
      if (!id || !loc) continue;
      const m = loc.match(/^(\d+\.?\d*)\s+([NS])\s+(\d+\.?\d*)\s+([EW])/);
      if (!m) continue;
      let lat = parseFloat(m[1]); let lng = parseFloat(m[3]);
      if (m[2] === "S") lat = -lat;
      if (m[4] === "W") lng = -lng;
      if (lat === 0 && lng === 0) continue;
      stations.push({ id, lat, lng });
    }
    ndbcStations = stations;
    return stations;
  } catch { return []; }
}

function parseNdbcFloat(val: string, threshold: number): number | null {
  if (val === "MM" || val === "") return null;
  const n = parseFloat(val);
  return isNaN(n) || n >= threshold ? null : n;
}

function parseNdbcStdmet(text: string): NdbcObs[] {
  const obs: NdbcObs[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const c = line.trim().split(/\s+/);
    if (c.length < 13) continue;
    const yr = parseInt(c[0]); const mo = parseInt(c[1]); const dy = parseInt(c[2]);
    const hr = parseInt(c[3]); const mn = parseInt(c[4]);
    if (isNaN(yr) || isNaN(mo) || isNaN(dy)) continue;
    const fullYr = yr < 100 ? (yr > 70 ? 1900 + yr : 2000 + yr) : yr;
    obs.push({
      time: new Date(Date.UTC(fullYr, mo - 1, dy, hr, mn)),
      waveHeight: parseNdbcFloat(c[8], 99),
      dominantPeriod: parseNdbcFloat(c[9], 99),
      meanWaveDirection: parseNdbcFloat(c[11], 999),
    });
  }
  return obs;
}

async function fetchNdbcWaveData(lat: number, lng: number, date: Date): Promise<NdbcObs | null> {
  const stations = await getNdbcStations();
  let nearest: NdbcStation | null = null;
  let minDist = Infinity;
  for (const s of stations) {
    const d = haversineKm(lat, lng, s.lat, s.lng);
    if (d < minDist && d <= 100) { minDist = d; nearest = s; }
  }
  if (!nearest) return null;

  const year = date.getUTCFullYear();
  const cacheKey = `${nearest.id}-${year}`;
  let observations = ndbcCache.get(cacheKey);
  if (!observations) {
    try {
      const url = `${NDBC_HISTORICAL_URL}?filename=${nearest.id}h${year}.txt.gz&dir=data/historical/stdmet/`;
      const res = await fetch(url);
      if (!res.ok) { ndbcCache.set(cacheKey, []); return null; }
      const text = await res.text();
      if (text.includes("</html>") || text.includes("Unable to access")) { ndbcCache.set(cacheKey, []); return null; }
      observations = parseNdbcStdmet(text);
      ndbcCache.set(cacheKey, observations);
    } catch { return null; }
  }

  const targetMs = date.getTime();
  const maxDiffMs = 1.5 * 60 * 60 * 1000;
  let closest: NdbcObs | null = null;
  let closestDiff = Infinity;
  for (const o of observations) {
    const diff = Math.abs(o.time.getTime() - targetMs);
    if (diff < closestDiff && diff <= maxDiffMs) { closestDiff = diff; closest = o; }
  }
  if (closest) console.log(`    NDBC fallback: station ${nearest.id} (${minDist.toFixed(0)}km away)`);
  return closest;
}

async function fetchHistorical(lat: number, lng: number, date: Date): Promise<Conditions | null> {
  const dateStr = date.toISOString().split("T")[0];

  // Marine API for wave/swell data (supports historical dates)
  const marineParams = new URLSearchParams({
    latitude: lat.toString(), longitude: lng.toString(),
    start_date: dateStr, end_date: dateStr,
    hourly: MARINE_PARAMS, timezone: "auto",
  });

  // ERA5 for weather data
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

    let waveHeight = marine?.hourly?.wave_height?.[closestIndex] ?? null;
    let wavePeriod = marine?.hourly?.wave_period?.[closestIndex] ?? null;
    let waveDirection = marine?.hourly?.wave_direction?.[closestIndex] ?? null;
    let primarySwellHeight = marine?.hourly?.swell_wave_height?.[closestIndex] ?? null;
    let primarySwellPeriod = marine?.hourly?.swell_wave_period?.[closestIndex] ?? null;
    let primarySwellDirection = marine?.hourly?.swell_wave_direction?.[closestIndex] ?? null;

    // NDBC buoy fallback when Open-Meteo marine has no wave data
    if (waveHeight === null && wavePeriod === null) {
      const ndbc = await fetchNdbcWaveData(lat, lng, date);
      if (ndbc) {
        waveHeight = ndbc.waveHeight;
        wavePeriod = ndbc.dominantPeriod;
        waveDirection = ndbc.meanWaveDirection;
        primarySwellHeight = ndbc.waveHeight;
        primarySwellPeriod = ndbc.dominantPeriod;
        primarySwellDirection = ndbc.meanWaveDirection;
      }
    }

    return {
      waveHeight,
      wavePeriod,
      waveDirection,
      primarySwellHeight,
      primarySwellPeriod,
      primarySwellDirection,
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

async function fetchCurrent(lat: number, lng: number): Promise<Conditions | null> {
  try {
    const marineParams = new URLSearchParams({
      latitude: lat.toString(), longitude: lng.toString(),
      hourly: MARINE_PARAMS, forecast_days: "1", timezone: "auto",
    });
    const weatherParams = new URLSearchParams({
      latitude: lat.toString(), longitude: lng.toString(),
      hourly: WEATHER_PARAMS, forecast_days: "1", timezone: "auto",
    });

    const [marineRes, weatherRes] = await Promise.all([
      fetch(`${MARINE_API_BASE}?${marineParams}`),
      fetch(`https://api.open-meteo.com/v1/forecast?${weatherParams}`),
    ]);

    if (!marineRes.ok) return null;
    const marine = await marineRes.json();
    const weather = weatherRes.ok ? await weatherRes.json() : null;

    const now = new Date();
    let idx = 0;
    let minDiff = Infinity;
    (marine.hourly.time as string[]).forEach((t: string, i: number) => {
      const diff = Math.abs(new Date(t).getTime() - now.getTime());
      if (diff < minDiff) { minDiff = diff; idx = i; }
    });

    return {
      waveHeight: marine.hourly.wave_height?.[idx] ?? null,
      wavePeriod: marine.hourly.wave_period?.[idx] ?? null,
      waveDirection: marine.hourly.wave_direction?.[idx] ?? null,
      primarySwellHeight: marine.hourly.swell_wave_height?.[idx] ?? null,
      primarySwellPeriod: marine.hourly.swell_wave_period?.[idx] ?? null,
      primarySwellDirection: marine.hourly.swell_wave_direction?.[idx] ?? null,
      secondarySwellHeight: marine.hourly.secondary_swell_wave_height?.[idx] ?? null,
      secondarySwellPeriod: marine.hourly.secondary_swell_wave_period?.[idx] ?? null,
      secondarySwellDirection: marine.hourly.secondary_swell_wave_direction?.[idx] ?? null,
      windWaveHeight: marine.hourly.wind_wave_height?.[idx] ?? null,
      windWavePeriod: marine.hourly.wind_wave_period?.[idx] ?? null,
      windWaveDirection: marine.hourly.wind_wave_direction?.[idx] ?? null,
      windSpeed: weather?.hourly?.wind_speed_10m?.[idx] ?? null,
      windDirection: weather?.hourly?.wind_direction_10m?.[idx] ?? null,
      windGust: weather?.hourly?.wind_gusts_10m?.[idx] ?? null,
      airTemp: weather?.hourly?.temperature_2m?.[idx] ?? null,
      seaSurfaceTemp: weather?.hourly?.sea_surface_temperature?.[idx] ?? null,
      humidity: weather?.hourly?.relative_humidity_2m?.[idx] ?? null,
      precipitation: weather?.hourly?.precipitation?.[idx] ?? null,
      pressureMsl: weather?.hourly?.pressure_msl?.[idx] ?? null,
      cloudCover: weather?.hourly?.cloud_cover?.[idx] ?? null,
      visibility: weather?.hourly?.visibility?.[idx] ?? null,
      tideHeight: null,
      timestamp: new Date(marine.hourly.time[idx]),
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

  const allSessions = await db.query.surfSessions.findMany({
    with: { conditions: true, spot: true },
  });

  console.log(`Found ${allSessions.length} sessions to backfill`);

  let updated = 0;
  let failed = 0;

  for (const s of allSessions) {
    if (!s.spot) { console.log(`  Skip ${s.id}: no spot`); failed++; continue; }

    const lat = parseFloat(s.spot.latitude);
    const lng = parseFloat(s.spot.longitude);
    const sessionDate = new Date(s.startTime);

    console.log(`  Processing ${s.id} (${s.spot.name}, ${sessionDate.toISOString().split("T")[0]})...`);

    let conditions = await fetchHistorical(lat, lng, sessionDate);
    if (!conditions) {
      console.log(`    Historical failed, trying current...`);
      conditions = await fetchCurrent(lat, lng);
    }

    if (!conditions) {
      console.log(`    FAILED: no conditions available`);
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
    console.log(`    OK (wave: ${conditions.waveHeight}m, wind: ${conditions.windSpeed}km/h, gust: ${conditions.windGust}km/h, airTemp: ${conditions.airTemp}°C)`);

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed out of ${allSessions.length}`);
  await client.end();
}

main().catch(console.error);
