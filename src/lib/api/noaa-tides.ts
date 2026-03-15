/**
 * NOAA CO-OPS Tides & Currents API integration.
 * Free, no API key required. Provides tide predictions from ~3000+ US stations.
 * For non-US locations, tide data will gracefully return null.
 */

const NOAA_METADATA_API =
  "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json";
const NOAA_DATA_API =
  "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

interface NoaaStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string; // "R" = reference/harmonic, "S" = subordinate
  referenceId: string; // for subordinate stations, the reference station ID
}

interface NoaaPrediction {
  t: string; // "2026-03-15 10:00"
  v: string; // "3.456" (feet)
}

// In-memory cache for station list (fetched once per server lifecycle).
// Uses a singleton promise to prevent thundering-herd on concurrent callers.
let stationCache: NoaaStation[] | null = null;
let stationCacheTime = 0;
let stationFetchPromise: Promise<NoaaStation[]> | null = null;
const STATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Haversine distance in km between two lat/lng points.
 */
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

/**
 * Fetch and cache all NOAA tide prediction stations.
 */
async function getStations(): Promise<NoaaStation[]> {
  if (stationCache && Date.now() - stationCacheTime < STATION_CACHE_TTL) {
    return stationCache;
  }

  // Singleton promise: if a fetch is already in-flight, reuse it
  // instead of firing duplicate 2.6MB downloads
  if (stationFetchPromise) return stationFetchPromise;

  stationFetchPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      // Skip Next.js data cache — response is 2.6MB and exceeds the 2MB limit,
      // so { next: { revalidate } } is a no-op. Use no-store to avoid the warning.
      const res = await fetch(
        `${NOAA_METADATA_API}?type=tidepredictions&units=english`,
        { signal: controller.signal, cache: "no-store" }
      );
      clearTimeout(timeout);

      if (!res.ok) return [];

      const data = await res.json();
      const stations: NoaaStation[] = (data.stations || []).map(
        (s: {
          id: string;
          name: string;
          lat: number;
          lng: number;
          type: string;
          reference_id: string;
        }) => ({
          id: s.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          type: s.type || "R",
          referenceId: s.reference_id || s.id,
        })
      );

      stationCache = stations;
      stationCacheTime = Date.now();
      return stations;
    } catch (err) {
      console.warn("Failed to fetch NOAA stations:", err);
      return [];
    } finally {
      stationFetchPromise = null;
    }
  })();

  return stationFetchPromise;
}

/**
 * Pre-warm the station cache. Call once before batch-processing spots
 * so the 2.6MB download is done before any forecast fetches compete for bandwidth.
 */
export async function warmStationCache(): Promise<void> {
  await getStations();
}

/**
 * Find the nearest NOAA tide station within maxDistanceKm.
 * Returns the station ID to use for predictions — for subordinate stations,
 * this is the reference station ID since NOAA only serves predictions
 * for harmonic (type "R") stations.
 */
async function findPredictionStationId(
  lat: number,
  lng: number,
  maxDistanceKm = 50
): Promise<string | null> {
  const stations = await getStations();
  let nearest: NoaaStation | null = null;
  let minDist = Infinity;

  for (const station of stations) {
    const dist = haversineKm(lat, lng, station.lat, station.lng);
    if (dist < minDist && dist <= maxDistanceKm) {
      minDist = dist;
      nearest = station;
    }
  }

  if (!nearest) return null;

  // Subordinate stations don't serve predictions directly —
  // use their reference station instead
  return nearest.type === "R" ? nearest.id : nearest.referenceId;
}

function formatNoaaDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Fetch hourly tide predictions from a NOAA station for a date range.
 * Returns predictions in feet relative to MLLW datum.
 */
async function fetchPredictions(
  stationId: string,
  startDate: Date,
  endDate: Date
): Promise<NoaaPrediction[]> {
  const params = new URLSearchParams({
    station: stationId,
    begin_date: formatNoaaDate(startDate),
    end_date: formatNoaaDate(endDate),
    product: "predictions",
    datum: "MLLW",
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    interval: "h",
  });

  try {
    const res = await fetch(`${NOAA_DATA_API}?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    return data.predictions || [];
  } catch (err) {
    console.warn("Failed to fetch NOAA predictions:", err);
    return [];
  }
}

/**
 * Fetch a single tide height for a specific timestamp.
 * Returns height in feet or null if no station found.
 */
export async function fetchTideHeight(
  latitude: number,
  longitude: number,
  date: Date
): Promise<number | null> {
  const stationId = await findPredictionStationId(latitude, longitude);
  if (!stationId) return null;

  const dayBefore = new Date(date);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const dayAfter = new Date(date);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

  const predictions = await fetchPredictions(stationId, dayBefore, dayAfter);
  if (predictions.length === 0) return null;

  // Find closest prediction to target time
  const targetMs = date.getTime();
  let closest: NoaaPrediction | null = null;
  let minDiff = Infinity;

  for (const p of predictions) {
    const pTime = new Date(p.t).getTime();
    const diff = Math.abs(pTime - targetMs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }

  return closest ? parseFloat(closest.v) : null;
}

/**
 * Fetch hourly tide predictions for a timeline window.
 * Returns an array of { time, height } objects aligned to the given hours,
 * or null if no station is found nearby.
 */
export async function fetchTideTimeline(
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<{ time: string; height: number }[] | null> {
  const stationId = await findPredictionStationId(latitude, longitude);
  if (!stationId) return null;

  const predictions = await fetchPredictions(stationId, startDate, endDate);
  if (predictions.length === 0) return null;

  return predictions.map((p) => ({
    time: p.t,
    height: parseFloat(p.v),
  }));
}
