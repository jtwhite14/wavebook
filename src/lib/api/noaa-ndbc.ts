/**
 * NOAA NDBC (National Data Buoy Center) historical wave data.
 * Provides wave height, period, and direction from ~1300+ buoy stations.
 * Used as fallback when Open-Meteo Marine API lacks historical data (pre-Oct 2021).
 * Free, no API key required.
 */

const NDBC_STATION_TABLE_URL =
  "https://www.ndbc.noaa.gov/data/stations/station_table.txt";
const NDBC_HISTORICAL_URL =
  "https://www.ndbc.noaa.gov/view_text_file.php";
const NDBC_REALTIME_URL =
  "https://www.ndbc.noaa.gov/data/realtime2";

// ── Types ──

interface NdbcStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface NdbcObservation {
  time: Date;
  waveHeight: number | null;        // WVHT in meters
  dominantPeriod: number | null;     // DPD in seconds
  averagePeriod: number | null;      // APD in seconds
  meanWaveDirection: number | null;  // MWD in degrees true
}

// ── Caches ──

let stationCache: NdbcStation[] | null = null;
let stationCacheTime = 0;
const STATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cache parsed yearly files: key = "stationId-year"
const stdmetCache = new Map<string, NdbcObservation[]>();

// ── Haversine ──

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Station discovery ──

/**
 * Parse the NDBC station_table.txt pipe-delimited format.
 * Location field looks like: "44.794 N 87.313 W (44°47'39" N 87°18'48" W)"
 */
function parseStationTable(text: string): NdbcStation[] {
  const stations: NdbcStation[] = [];

  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;

    const parts = line.split("|");
    if (parts.length < 7) continue;

    const id = parts[0].trim();
    const name = parts[4].trim();
    const locationStr = parts[6].trim();

    if (!id || !locationStr) continue;

    // Parse "44.794 N 87.313 W" from the start of the location field
    const match = locationStr.match(
      /^(\d+\.?\d*)\s+([NS])\s+(\d+\.?\d*)\s+([EW])/
    );
    if (!match) continue;

    let lat = parseFloat(match[1]);
    let lng = parseFloat(match[3]);
    if (match[2] === "S") lat = -lat;
    if (match[4] === "W") lng = -lng;

    // Skip stations at 0,0 (placeholder coordinates)
    if (lat === 0 && lng === 0) continue;

    stations.push({ id, name, lat, lng });
  }

  return stations;
}

async function getStations(): Promise<NdbcStation[]> {
  if (stationCache && Date.now() - stationCacheTime < STATION_CACHE_TTL) {
    return stationCache;
  }

  try {
    const res = await fetch(NDBC_STATION_TABLE_URL);
    if (!res.ok) return stationCache || [];

    const text = await res.text();
    stationCache = parseStationTable(text);
    stationCacheTime = Date.now();
    return stationCache;
  } catch (err) {
    console.warn("Failed to fetch NDBC station table:", err);
    return stationCache || [];
  }
}

/**
 * Find the nearest NDBC station within maxDistanceKm.
 * Returns station ID and distance, or null if none within range.
 */
export async function findNearestNdbcStation(
  latitude: number,
  longitude: number,
  maxDistanceKm = 100
): Promise<{ stationId: string; distanceKm: number } | null> {
  const stations = await getStations();
  let nearest: NdbcStation | null = null;
  let minDist = Infinity;

  for (const station of stations) {
    const dist = haversineKm(latitude, longitude, station.lat, station.lng);
    if (dist < minDist && dist <= maxDistanceKm) {
      minDist = dist;
      nearest = station;
    }
  }

  if (!nearest) return null;
  return { stationId: nearest.id, distanceKm: minDist };
}

// ── Stdmet parsing ──

/**
 * Parse a value as a float, returning null for NDBC missing-value markers.
 * NDBC uses 99.0 for WVHT/DPD/APD, 999 for MWD/WDIR, and "MM" in realtime.
 */
function parseNdbcFloat(
  val: string,
  missingThreshold: number
): number | null {
  if (val === "MM" || val === "") return null;
  const n = parseFloat(val);
  if (isNaN(n) || n >= missingThreshold) return null;
  return n;
}

/**
 * Parse NDBC stdmet text (historical or realtime format).
 * Both formats have 2 header lines starting with '#'.
 */
function parseStdmet(text: string): NdbcObservation[] {
  const observations: NdbcObservation[] = [];

  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;

    const cols = line.trim().split(/\s+/);
    if (cols.length < 13) continue;

    // Columns: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP ...
    const year = parseInt(cols[0]);
    const month = parseInt(cols[1]);
    const day = parseInt(cols[2]);
    const hour = parseInt(cols[3]);
    const minute = parseInt(cols[4]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) continue;

    // Handle 2-digit years (historical files before 1999)
    const fullYear = year < 100 ? (year > 70 ? 1900 + year : 2000 + year) : year;

    const time = new Date(
      Date.UTC(fullYear, month - 1, day, hour, minute)
    );

    observations.push({
      time,
      waveHeight: parseNdbcFloat(cols[8], 99),         // WVHT, missing = 99.0
      dominantPeriod: parseNdbcFloat(cols[9], 99),      // DPD, missing = 99.0
      averagePeriod: parseNdbcFloat(cols[10], 99),      // APD, missing = 99.0
      meanWaveDirection: parseNdbcFloat(cols[11], 999),  // MWD, missing = 999
    });
  }

  return observations;
}

// ── Data fetching ──

async function fetchHistoricalStdmet(
  stationId: string,
  year: number
): Promise<NdbcObservation[]> {
  const cacheKey = `${stationId}-${year}`;
  const cached = stdmetCache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `${NDBC_HISTORICAL_URL}?filename=${stationId}h${year}.txt.gz&dir=data/historical/stdmet/`;
    const res = await fetch(url);

    if (!res.ok) {
      // 404 = station doesn't have data for this year
      stdmetCache.set(cacheKey, []);
      return [];
    }

    const text = await res.text();

    // NDBC returns an HTML page with "no data" message for missing data
    if (text.includes("</html>") || text.includes("Unable to access")) {
      stdmetCache.set(cacheKey, []);
      return [];
    }

    const observations = parseStdmet(text);
    stdmetCache.set(cacheKey, observations);
    return observations;
  } catch (err) {
    console.warn(`Failed to fetch NDBC stdmet for ${stationId}/${year}:`, err);
    return [];
  }
}

async function fetchRealtimeStdmet(
  stationId: string
): Promise<NdbcObservation[]> {
  // Realtime data covers the last 45 days; cache for 1 hour
  const cacheKey = `${stationId}-realtime`;
  const cached = stdmetCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${NDBC_REALTIME_URL}/${stationId}.txt`);
    if (!res.ok) return [];

    const text = await res.text();
    const observations = parseStdmet(text);
    stdmetCache.set(cacheKey, observations);
    return observations;
  } catch (err) {
    console.warn(`Failed to fetch NDBC realtime for ${stationId}:`, err);
    return [];
  }
}

// ── Public API ──

/**
 * Fetch the closest NDBC observation to a given timestamp.
 * Tries historical archive first, falls back to realtime for recent data.
 * Returns null if no station nearby or no data within 1.5 hours of the target.
 */
export async function fetchNdbcWaveData(
  latitude: number,
  longitude: number,
  date: Date
): Promise<NdbcObservation | null> {
  const station = await findNearestNdbcStation(latitude, longitude);
  if (!station) return null;

  const year = date.getUTCFullYear();
  let observations = await fetchHistoricalStdmet(station.stationId, year);

  // If historical file is empty, try realtime (covers last 45 days)
  if (observations.length === 0) {
    observations = await fetchRealtimeStdmet(station.stationId);
  }

  if (observations.length === 0) return null;

  // Find closest observation within 1.5 hour tolerance
  const targetMs = date.getTime();
  const maxDiffMs = 1.5 * 60 * 60 * 1000;
  let closest: NdbcObservation | null = null;
  let minDiff = Infinity;

  for (const obs of observations) {
    const diff = Math.abs(obs.time.getTime() - targetMs);
    if (diff < minDiff && diff <= maxDiffMs) {
      minDiff = diff;
      closest = obs;
    }
  }

  return closest;
}

/**
 * Fetch NDBC observations for a range of hours (used for timeline backfill).
 * Returns a Map keyed by UTC hour string "YYYY-MM-DDTHH:00" for easy lookup.
 */
export async function fetchNdbcTimeline(
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<Map<string, NdbcObservation> | null> {
  const station = await findNearestNdbcStation(latitude, longitude);
  if (!station) return null;

  // Collect observations across years the range might span
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();

  let allObs: NdbcObservation[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const obs = await fetchHistoricalStdmet(station.stationId, year);
    allObs = allObs.concat(obs);
  }

  // Fallback to realtime if no historical data
  if (allObs.length === 0) {
    allObs = await fetchRealtimeStdmet(station.stationId);
  }

  if (allObs.length === 0) return null;

  // Filter to the date range and build hourly map
  const startMs = startDate.getTime() - 1.5 * 60 * 60 * 1000;
  const endMs = endDate.getTime() + 1.5 * 60 * 60 * 1000;
  const rangeObs = allObs.filter(
    (o) => o.time.getTime() >= startMs && o.time.getTime() <= endMs
  );

  if (rangeObs.length === 0) return null;

  // Build map keyed by rounded UTC hour
  const map = new Map<string, NdbcObservation>();
  for (const obs of rangeObs) {
    const d = obs.time;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:00`;
    // Keep the observation closest to the top of the hour
    if (!map.has(key)) {
      map.set(key, obs);
    }
  }

  return map;
}
