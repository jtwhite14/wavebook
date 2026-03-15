import { MarineConditions, HourlyForecast, ForecastData } from "@/types";
import { fetchTideHeight, fetchTideTimeline } from "./noaa-tides";
import { fetchNdbcWaveData, fetchNdbcTimeline } from "./noaa-ndbc";
import { calculateWaveEnergy } from "@/lib/wave-energy";

const MARINE_API_BASE = "https://marine-api.open-meteo.com/v1/marine";
const HISTORICAL_API_BASE = "https://archive-api.open-meteo.com/v1/era5";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

/**
 * Fetch with timeout and retry for transient connection errors.
 * Open-Meteo's free tier can refuse connections under concurrent load,
 * so we retry on ConnectTimeoutError with exponential backoff.
 */
async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    return res;
  } catch (error: unknown) {
    const code = (error as { cause?: { code?: string } })?.cause?.code;
    const isRetryable =
      code === "UND_ERR_CONNECT_TIMEOUT" ||
      code === "ECONNRESET" ||
      code === "UND_ERR_SOCKET" ||
      (error instanceof DOMException && error.name === "AbortError");
    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = 1000 * 2 ** attempt; // 1s, 2s
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Marine API parameters for surf conditions
const MARINE_PARAMS = [
  "wave_height",
  "wave_period",
  "wave_direction",
  "swell_wave_height",
  "swell_wave_period",
  "swell_wave_direction",
  "secondary_swell_wave_height",
  "secondary_swell_wave_period",
  "secondary_swell_wave_direction",
  "wind_wave_height",
  "wind_wave_period",
  "wind_wave_direction",
].join(",");

const WEATHER_PARAMS = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "pressure_msl",
  "cloud_cover",
  "visibility",
  "weather_code",
  "is_day",
].join(",");

interface OpenMeteoMarineResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    wave_height?: number[];
    wave_period?: number[];
    wave_direction?: number[];
    swell_wave_height?: number[];
    swell_wave_period?: number[];
    swell_wave_direction?: number[];
    secondary_swell_wave_height?: number[];
    secondary_swell_wave_period?: number[];
    secondary_swell_wave_direction?: number[];
    wind_wave_height?: number[];
    wind_wave_period?: number[];
    wind_wave_direction?: number[];
  };
}

interface OpenMeteoWeatherResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
    temperature_2m?: number[];
    sea_surface_temperature?: number[];
    relative_humidity_2m?: number[];
    precipitation?: number[];
    pressure_msl?: number[];
    cloud_cover?: number[];
    visibility?: number[];
    weather_code?: number[];
    is_day?: number[];
  };
}

/**
 * Fetch 16-day marine forecast for a location
 */
export async function fetchMarineForecast(
  latitude: number,
  longitude: number
): Promise<ForecastData> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: MARINE_PARAMS,
    forecast_days: "16",
    timezone: "auto",
  });

  const weatherParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: WEATHER_PARAMS,
    forecast_days: "16",
    timezone: "auto",
  });

  // Fetch marine and weather data sequentially — parallel connections to
  // Open-Meteo's free tier cause ConnectTimeoutError under cron concurrency
  const response = await fetchWithRetry(`${MARINE_API_BASE}?${params}`);
  const weatherResponse = await fetchWithRetry(`https://api.open-meteo.com/v1/forecast?${weatherParams}`);

  if (!response.ok) {
    throw new Error(`Marine API error: ${response.status}`);
  }

  const [data, weatherData]: [OpenMeteoMarineResponse, OpenMeteoWeatherResponse | null] =
    await Promise.all([
      response.json(),
      weatherResponse.ok ? weatherResponse.json() : Promise.resolve(null),
    ]);

  return transformForecastResponse(data, weatherData);
}

/**
 * Fetch historical marine conditions for a specific date/time.
 * Calls both the Marine API (wave/swell data) and ERA5 (weather data) in parallel.
 */
export async function fetchHistoricalConditions(
  latitude: number,
  longitude: number,
  date: Date
): Promise<MarineConditions | null> {
  const dateStr = date.toISOString().split("T")[0];

  // ERA5 archive has ~5 day lag; use forecast weather API for recent dates
  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const weatherApiBase = daysAgo <= 5
    ? "https://api.open-meteo.com/v1/forecast"
    : HISTORICAL_API_BASE;

  // Query a 2-day range around the UTC date to handle timezone boundaries
  // (e.g. 10pm Pacific July 15 = 5am UTC July 16)
  const dayBefore = new Date(date);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const dayBeforeStr = dayBefore.toISOString().split("T")[0];
  const dayAfter = new Date(date);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  const dayAfterStr = dayAfter.toISOString().split("T")[0];

  // Marine API — use GMT so times match the UTC-stored session time
  const marineParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: dayBeforeStr,
    end_date: dayAfterStr,
    hourly: MARINE_PARAMS,
  });

  // Weather data (wind, temp, pressure, etc.)
  const weatherHourly = [
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "temperature_2m",
    "sea_surface_temperature",
    "relative_humidity_2m",
    "precipitation",
    "pressure_msl",
    "cloud_cover",
    "visibility",
    "weather_code",
    "is_day",
  ].join(",");

  const weatherParamsObj: Record<string, string> = {
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: weatherHourly,
    start_date: dayBeforeStr,
    end_date: dayAfterStr,
  };
  const weatherParams = new URLSearchParams(weatherParamsObj);

  try {
    const [marineResponse, weatherResponse, tideHeight] = await Promise.all([
      fetchWithRetry(`${MARINE_API_BASE}?${marineParams}`),
      fetchWithRetry(`${weatherApiBase}?${weatherParams}`),
      fetchTideHeight(latitude, longitude, date),
    ]);

    // We need at least one source to succeed
    if (!marineResponse.ok && !weatherResponse.ok) {
      console.warn(`Historical APIs both failed: marine=${marineResponse.status}, weather=${weatherResponse.status}`);
      return null;
    }

    const marineData: OpenMeteoMarineResponse | null = marineResponse.ok ? await marineResponse.json() : null;
    const weatherData = weatherResponse.ok ? await weatherResponse.json() : null;

    // Find closest hour index in each dataset independently
    // (marine and weather may have different time arrays)
    const targetMs = date.getTime();

    const findClosestIndex = (timeArray: string[]): number => {
      let best = 0;
      let minDiff = Infinity;
      timeArray.forEach((time, i) => {
        const diff = Math.abs(new Date(time).getTime() - targetMs);
        if (diff < minDiff) {
          minDiff = diff;
          best = i;
        }
      });
      return best;
    }

    const marineTimes = marineData?.hourly?.time || [];
    const weatherTimes = weatherData?.hourly?.time || [];
    if (marineTimes.length === 0 && weatherTimes.length === 0) return null;

    const mi = marineTimes.length > 0 ? findClosestIndex(marineTimes) : -1;
    const wi = weatherTimes.length > 0 ? findClosestIndex(weatherTimes) : -1;

    // Extract marine wave fields
    let waveHeight = mi >= 0 ? (marineData!.hourly.wave_height?.[mi] ?? null) : null;
    let wavePeriod = mi >= 0 ? (marineData!.hourly.wave_period?.[mi] ?? null) : null;
    let waveDirection = mi >= 0 ? (marineData!.hourly.wave_direction?.[mi] ?? null) : null;
    let primarySwellHeight = mi >= 0 ? (marineData!.hourly.swell_wave_height?.[mi] ?? null) : null;
    let primarySwellPeriod = mi >= 0 ? (marineData!.hourly.swell_wave_period?.[mi] ?? null) : null;
    let primarySwellDirection = mi >= 0 ? (marineData!.hourly.swell_wave_direction?.[mi] ?? null) : null;
    const secondarySwellHeight = mi >= 0 ? (marineData!.hourly.secondary_swell_wave_height?.[mi] ?? null) : null;
    const secondarySwellPeriod = mi >= 0 ? (marineData!.hourly.secondary_swell_wave_period?.[mi] ?? null) : null;
    const secondarySwellDirection = mi >= 0 ? (marineData!.hourly.secondary_swell_wave_direction?.[mi] ?? null) : null;
    const windWaveHeight = mi >= 0 ? (marineData!.hourly.wind_wave_height?.[mi] ?? null) : null;
    const windWavePeriod = mi >= 0 ? (marineData!.hourly.wind_wave_period?.[mi] ?? null) : null;
    const windWaveDirection = mi >= 0 ? (marineData!.hourly.wind_wave_direction?.[mi] ?? null) : null;

    // NDBC buoy fallback: if Open-Meteo marine returned no wave data,
    // try the nearest NOAA buoy for historical observations
    if (waveHeight === null && wavePeriod === null) {
      const ndbc = await fetchNdbcWaveData(latitude, longitude, date);
      if (ndbc) {
        waveHeight = ndbc.waveHeight;
        wavePeriod = ndbc.dominantPeriod;
        waveDirection = ndbc.meanWaveDirection;
        // Use dominant period as primary swell period (best approximation)
        primarySwellHeight = ndbc.waveHeight;
        primarySwellPeriod = ndbc.dominantPeriod;
        primarySwellDirection = ndbc.meanWaveDirection;
        // NDBC stdmet doesn't decompose swell further
      }
    }

    return {
      waveHeight,
      wavePeriod,
      waveDirection,
      primarySwellHeight,
      primarySwellPeriod,
      primarySwellDirection,
      secondarySwellHeight,
      secondarySwellPeriod,
      secondarySwellDirection,
      windWaveHeight,
      windWavePeriod,
      windWaveDirection,
      windSpeed: wi >= 0 ? (weatherData!.hourly.wind_speed_10m?.[wi] ?? null) : null,
      windDirection: wi >= 0 ? (weatherData!.hourly.wind_direction_10m?.[wi] ?? null) : null,
      windGust: wi >= 0 ? (weatherData!.hourly.wind_gusts_10m?.[wi] ?? null) : null,
      airTemp: wi >= 0 ? (weatherData!.hourly.temperature_2m?.[wi] ?? null) : null,
      seaSurfaceTemp: wi >= 0 ? (weatherData!.hourly.sea_surface_temperature?.[wi] ?? null) : null,
      humidity: wi >= 0 ? (weatherData!.hourly.relative_humidity_2m?.[wi] ?? null) : null,
      precipitation: wi >= 0 ? (weatherData!.hourly.precipitation?.[wi] ?? null) : null,
      pressureMsl: wi >= 0 ? (weatherData!.hourly.pressure_msl?.[wi] ?? null) : null,
      cloudCover: wi >= 0 ? (weatherData!.hourly.cloud_cover?.[wi] ?? null) : null,
      visibility: wi >= 0 ? (weatherData!.hourly.visibility?.[wi] ?? null) : null,
      tideHeight,
      waveEnergy: calculateWaveEnergy(primarySwellHeight, primarySwellPeriod),
      weatherCode: wi >= 0 ? (weatherData!.hourly.weather_code?.[wi] ?? null) : null,
      isDay: wi >= 0 && weatherData!.hourly.is_day?.[wi] != null ? weatherData!.hourly.is_day[wi] === 1 : null,
      timestamp: new Date(marineTimes[mi] || weatherTimes[wi]),
    };
  } catch (error) {
    console.error("Error fetching historical conditions:", error);
    return null;
  }
}

/**
 * Fetch current conditions for a location
 */
export async function fetchCurrentConditions(
  latitude: number,
  longitude: number
): Promise<MarineConditions | null> {
  try {
    const forecast = await fetchMarineForecast(latitude, longitude);

    // Find the closest hour to now.
    // Forecast times are local (timezone:"auto"), parsed as UTC on server,
    // so shift "now" by the UTC offset to compare in the same space.
    const nowLocalMs = Date.now() + forecast.utcOffsetSeconds * 1000;
    let closestHour = forecast.hourly[0];
    let minDiff = Infinity;

    for (const hour of forecast.hourly) {
      const hourTime = new Date(hour.time);
      const diff = Math.abs(hourTime.getTime() - nowLocalMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestHour = hour;
      }
    }

    return closestHour;
  } catch (error) {
    console.error("Error fetching current conditions:", error);
    return null;
  }
}

function transformForecastResponse(
  marineData: OpenMeteoMarineResponse,
  weatherData: OpenMeteoWeatherResponse | null
): ForecastData {
  const hourly: HourlyForecast[] = marineData.hourly.time.map((time, index) => {
    const swellHt = marineData.hourly.swell_wave_height?.[index] ?? null;
    const swellPd = marineData.hourly.swell_wave_period?.[index] ?? null;
    return {
      time,
      timestamp: new Date(time),
      waveHeight: marineData.hourly.wave_height?.[index] ?? null,
      wavePeriod: marineData.hourly.wave_period?.[index] ?? null,
      waveDirection: marineData.hourly.wave_direction?.[index] ?? null,
      primarySwellHeight: swellHt,
      primarySwellPeriod: swellPd,
      primarySwellDirection: marineData.hourly.swell_wave_direction?.[index] ?? null,
      secondarySwellHeight: marineData.hourly.secondary_swell_wave_height?.[index] ?? null,
      secondarySwellPeriod: marineData.hourly.secondary_swell_wave_period?.[index] ?? null,
      secondarySwellDirection: marineData.hourly.secondary_swell_wave_direction?.[index] ?? null,
      windWaveHeight: marineData.hourly.wind_wave_height?.[index] ?? null,
      windWavePeriod: marineData.hourly.wind_wave_period?.[index] ?? null,
      windWaveDirection: marineData.hourly.wind_wave_direction?.[index] ?? null,
      windSpeed: weatherData?.hourly?.wind_speed_10m?.[index] ?? null,
      windDirection: weatherData?.hourly?.wind_direction_10m?.[index] ?? null,
      windGust: weatherData?.hourly?.wind_gusts_10m?.[index] ?? null,
      airTemp: weatherData?.hourly?.temperature_2m?.[index] ?? null,
      seaSurfaceTemp: weatherData?.hourly?.sea_surface_temperature?.[index] ?? null,
      humidity: weatherData?.hourly?.relative_humidity_2m?.[index] ?? null,
      precipitation: weatherData?.hourly?.precipitation?.[index] ?? null,
      pressureMsl: weatherData?.hourly?.pressure_msl?.[index] ?? null,
      cloudCover: weatherData?.hourly?.cloud_cover?.[index] ?? null,
      visibility: weatherData?.hourly?.visibility?.[index] ?? null,
      tideHeight: null,
      waveEnergy: calculateWaveEnergy(swellHt, swellPd),
      weatherCode: weatherData?.hourly?.weather_code?.[index] ?? null,
      isDay: weatherData?.hourly?.is_day?.[index] != null ? weatherData.hourly.is_day[index] === 1 : null,
    };
  });

  return {
    latitude: marineData.latitude,
    longitude: marineData.longitude,
    hourly,
    utcOffsetSeconds: marineData.utc_offset_seconds ?? 0,
    fetchedAt: new Date(),
  };
}

// ── Numeric unit converters (for chart Y-axis values) ──

export function metersToFeet(m: number | null): number | null {
  return m != null ? m * 3.28084 : null;
}

export function kmhToMph(kmh: number | null): number | null {
  return kmh != null ? kmh * 0.621371 : null;
}

export function celsiusToFahrenheit(c: number | null): number | null {
  return c != null ? c * 9 / 5 + 32 : null;
}

export function hpaToInHg(hpa: number | null): number | null {
  return hpa != null ? hpa * 0.02953 : null;
}

export function metersToMiles(m: number | null): number | null {
  return m != null ? m / 1609.344 : null;
}

export function mmToInches(mm: number | null): number | null {
  return mm != null ? mm / 25.4 : null;
}

/**
 * Fetch hourly timeline for a 13-hour window centered on a session time.
 * Calls Marine API + ERA5 in parallel for a 2-day range, then slices.
 */
export async function fetchHourlyTimeline(
  latitude: number,
  longitude: number,
  sessionTime: Date
): Promise<{ timeline: HourlyForecast[]; sessionHourIndex: number }> {
  // Build a 2-day date range around the session to handle midnight crossings
  const dayBefore = new Date(sessionTime);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const dayAfter = new Date(sessionTime);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

  const startDate = dayBefore.toISOString().split("T")[0];
  const endDate = dayAfter.toISOString().split("T")[0];

  const marineParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: startDate,
    end_date: endDate,
    hourly: MARINE_PARAMS,
    timezone: "auto",
  });

  // ERA5 archive has ~5 day lag; use forecast weather API for recent dates
  const now = new Date();
  const daysAgo = Math.floor((now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60 * 24));
  const weatherApiBase = daysAgo <= 5
    ? "https://api.open-meteo.com/v1/forecast"
    : HISTORICAL_API_BASE;

  const weatherParamsObj: Record<string, string> = {
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: [
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "temperature_2m",
      "sea_surface_temperature",
      "relative_humidity_2m",
      "precipitation",
      "pressure_msl",
      "cloud_cover",
      "visibility",
      "weather_code",
      "is_day",
    ].join(","),
    timezone: "auto",
  };
  if (daysAgo <= 5) {
    // Forecast API: use past_days to cover the 2-day range around the session
    weatherParamsObj.past_days = Math.max(daysAgo + 1, 2).toString();
    weatherParamsObj.forecast_days = "2";
  } else {
    weatherParamsObj.start_date = startDate;
    weatherParamsObj.end_date = endDate;
  }
  const weatherParams = new URLSearchParams(weatherParamsObj);

  const [marineResponse, weatherResponse, tideData] = await Promise.all([
    fetchWithRetry(`${MARINE_API_BASE}?${marineParams}`),
    fetchWithRetry(`${weatherApiBase}?${weatherParams}`),
    fetchTideTimeline(latitude, longitude, dayBefore, dayAfter),
  ]);

  const marineData: OpenMeteoMarineResponse | null = marineResponse.ok
    ? await marineResponse.json()
    : null;
  const weatherData: OpenMeteoWeatherResponse | null = weatherResponse.ok
    ? await weatherResponse.json()
    : null;

  const times: string[] =
    marineData?.hourly?.time || weatherData?.hourly?.time || [];
  if (times.length === 0) {
    return { timeline: [], sessionHourIndex: 0 };
  }

  // Build a map of tide predictions by hour for quick lookup
  const tideByHour = new Map<string, number>();
  if (tideData) {
    for (const t of tideData) {
      // NOAA returns "YYYY-MM-DD HH:MM", normalize to match Open-Meteo "YYYY-MM-DDTHH:00"
      const d = new Date(t.time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
      tideByHour.set(key, t.height);
    }
  }

  // Build full hourly array
  const allHours: HourlyForecast[] = times.map((time, index) => {
    const swellHt = marineData?.hourly?.swell_wave_height?.[index] ?? null;
    const swellPd = marineData?.hourly?.swell_wave_period?.[index] ?? null;
    return {
      time,
      timestamp: new Date(time),
      waveHeight: marineData?.hourly?.wave_height?.[index] ?? null,
      wavePeriod: marineData?.hourly?.wave_period?.[index] ?? null,
      waveDirection: marineData?.hourly?.wave_direction?.[index] ?? null,
      primarySwellHeight: swellHt,
      primarySwellPeriod: swellPd,
      primarySwellDirection: marineData?.hourly?.swell_wave_direction?.[index] ?? null,
      secondarySwellHeight: marineData?.hourly?.secondary_swell_wave_height?.[index] ?? null,
      secondarySwellPeriod: marineData?.hourly?.secondary_swell_wave_period?.[index] ?? null,
      secondarySwellDirection: marineData?.hourly?.secondary_swell_wave_direction?.[index] ?? null,
      windWaveHeight: marineData?.hourly?.wind_wave_height?.[index] ?? null,
      windWavePeriod: marineData?.hourly?.wind_wave_period?.[index] ?? null,
      windWaveDirection: marineData?.hourly?.wind_wave_direction?.[index] ?? null,
      windSpeed: weatherData?.hourly?.wind_speed_10m?.[index] ?? null,
      windDirection: weatherData?.hourly?.wind_direction_10m?.[index] ?? null,
      windGust: weatherData?.hourly?.wind_gusts_10m?.[index] ?? null,
      airTemp: weatherData?.hourly?.temperature_2m?.[index] ?? null,
      seaSurfaceTemp: weatherData?.hourly?.sea_surface_temperature?.[index] ?? null,
      humidity: weatherData?.hourly?.relative_humidity_2m?.[index] ?? null,
      precipitation: weatherData?.hourly?.precipitation?.[index] ?? null,
      pressureMsl: weatherData?.hourly?.pressure_msl?.[index] ?? null,
      cloudCover: weatherData?.hourly?.cloud_cover?.[index] ?? null,
      visibility: weatherData?.hourly?.visibility?.[index] ?? null,
      tideHeight: tideByHour.get(time) ?? null,
      waveEnergy: calculateWaveEnergy(swellHt, swellPd),
      weatherCode: weatherData?.hourly?.weather_code?.[index] ?? null,
      isDay: weatherData?.hourly?.is_day?.[index] != null ? weatherData.hourly.is_day[index] === 1 : null,
    };
  });

  // NDBC buoy fallback: if Open-Meteo marine returned no wave data for the
  // entire timeline, backfill from the nearest NOAA buoy
  const hasAnyWaveData = allHours.some((h) => h.waveHeight !== null);
  if (!hasAnyWaveData) {
    const ndbcMap = await fetchNdbcTimeline(latitude, longitude, dayBefore, dayAfter);
    if (ndbcMap) {
      for (const hour of allHours) {
        // Timeline times are local (timezone:"auto"), NDBC keys are UTC.
        // Convert the local time to a UTC key for lookup.
        const localDate = new Date(hour.time);
        const utcMs = localDate.getTime() - (marineData?.utc_offset_seconds ?? weatherData?.utc_offset_seconds ?? 0) * 1000;
        const utcDate = new Date(utcMs);
        const utcKey = `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, "0")}-${String(utcDate.getUTCDate()).padStart(2, "0")}T${String(utcDate.getUTCHours()).padStart(2, "0")}:00`;
        const obs = ndbcMap.get(utcKey);
        if (obs) {
          hour.waveHeight = obs.waveHeight;
          hour.wavePeriod = obs.dominantPeriod;
          hour.waveDirection = obs.meanWaveDirection;
          hour.primarySwellHeight = obs.waveHeight;
          hour.primarySwellPeriod = obs.dominantPeriod;
          hour.primarySwellDirection = obs.meanWaveDirection;
          hour.waveEnergy = calculateWaveEnergy(obs.waveHeight, obs.dominantPeriod);
        }
      }
    }
  }

  // Find the closest hour to sessionTime.
  // Open-Meteo returns local times (no offset) due to timezone:"auto".
  // On the server (UTC), new Date("2026-03-10T10:00") parses as 10:00 UTC,
  // so we must shift sessionTime by utc_offset_seconds to compare in local time.
  const utcOffsetMs = (marineData?.utc_offset_seconds ?? weatherData?.utc_offset_seconds ?? 0) * 1000;
  const sessionLocalMs = sessionTime.getTime() + utcOffsetMs;
  let closestIndex = 0;
  let minDiff = Infinity;
  allHours.forEach((h, i) => {
    const diff = Math.abs(new Date(h.time).getTime() - sessionLocalMs);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  });

  // Slice 12 before, session hour, 11 after = 24 hours
  const sliceStart = Math.max(0, closestIndex - 12);
  const sliceEnd = Math.min(allHours.length, closestIndex + 12);
  const timeline = allHours.slice(sliceStart, sliceEnd);
  const sessionHourIndex = closestIndex - sliceStart;

  return { timeline, sessionHourIndex };
}

/**
 * Get wave direction as compass text
 */
export function getDirectionText(degrees: number | null): string {
  if (degrees === null) return "N/A";

  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Format wave height for display (meters → feet)
 */
export function formatWaveHeight(meters: number | null): string {
  if (meters === null) return "N/A";
  const feet = meters * 3.28084;
  return `${feet.toFixed(1)} ft`;
}

/**
 * Format wave period for display
 */
export function formatWavePeriod(seconds: number | null): string {
  if (seconds === null) return "N/A";
  return `${seconds.toFixed(0)}s`;
}

/**
 * Format wind speed for display (km/h → mph)
 */
export function formatWindSpeed(kmh: number | null): string {
  if (kmh === null) return "N/A";
  const mph = kmh * 0.621371;
  return `${mph.toFixed(0)} mph`;
}

/**
 * Format temperature for display (°C → °F)
 */
export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return "N/A";
  const fahrenheit = celsius * 9 / 5 + 32;
  return `${fahrenheit.toFixed(0)}°F`;
}

/**
 * Format visibility for display (meters → miles)
 */
export function formatVisibility(meters: number | null): string {
  if (meters === null) return "N/A";
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format pressure for display (hPa → inHg)
 */
export function formatPressure(hpa: number | null): string {
  if (hpa === null) return "N/A";
  const inHg = hpa * 0.02953;
  return `${inHg.toFixed(2)} inHg`;
}

/**
 * Format precipitation for display (mm → inches)
 */
export function formatPrecipitation(mm: number | null): string {
  if (mm === null) return "N/A";
  const inches = mm / 25.4;
  return `${inches.toFixed(2)} in`;
}

/**
 * Format tide height for display (already in feet from NOAA)
 */
export function formatTideHeight(feet: number | null): string {
  if (feet === null) return "N/A";
  return `${feet.toFixed(1)} ft`;
}
