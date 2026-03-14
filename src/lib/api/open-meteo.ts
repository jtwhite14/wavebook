import { MarineConditions, HourlyForecast, ForecastData } from "@/types";

const MARINE_API_BASE = "https://marine-api.open-meteo.com/v1/marine";
const HISTORICAL_API_BASE = "https://archive-api.open-meteo.com/v1/era5";

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
].join(",");

interface OpenMeteoMarineResponse {
  latitude: number;
  longitude: number;
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
  hourly: {
    time: string[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    sea_surface_temperature?: number[];
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

  const response = await fetch(`${MARINE_API_BASE}?${params}`);

  if (!response.ok) {
    throw new Error(`Marine API error: ${response.status}`);
  }

  const data: OpenMeteoMarineResponse = await response.json();

  // Also fetch weather data (wind)
  const weatherParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: WEATHER_PARAMS,
    forecast_days: "16",
    timezone: "auto",
  });

  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?${weatherParams}`
  );

  let weatherData: OpenMeteoWeatherResponse | null = null;
  if (weatherResponse.ok) {
    weatherData = await weatherResponse.json();
  }

  return transformForecastResponse(data, weatherData);
}

/**
 * Fetch historical marine conditions for a specific date/time
 */
export async function fetchHistoricalConditions(
  latitude: number,
  longitude: number,
  date: Date
): Promise<MarineConditions | null> {
  const dateStr = date.toISOString().split("T")[0];

  // ERA5 historical marine data
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: dateStr,
    end_date: dateStr,
    hourly: [
      "wave_height",
      "wave_period",
      "wave_direction",
      "wind_speed_10m",
      "wind_direction_10m",
      "sea_surface_temperature",
    ].join(","),
    timezone: "auto",
  });

  try {
    const response = await fetch(`${HISTORICAL_API_BASE}?${params}`);

    if (!response.ok) {
      // ERA5 data may not be available for recent dates
      console.warn(`Historical API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Find the closest hour to the requested time
    const targetHour = date.getUTCHours();
    const times: string[] = data.hourly?.time || [];

    let closestIndex = 0;
    let minDiff = Infinity;

    times.forEach((time: string, index: number) => {
      const hour = new Date(time).getUTCHours();
      const diff = Math.abs(hour - targetHour);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });

    return {
      waveHeight: data.hourly?.wave_height?.[closestIndex] ?? null,
      wavePeriod: data.hourly?.wave_period?.[closestIndex] ?? null,
      waveDirection: data.hourly?.wave_direction?.[closestIndex] ?? null,
      primarySwellHeight: data.hourly?.wave_height?.[closestIndex] ?? null,
      primarySwellPeriod: data.hourly?.wave_period?.[closestIndex] ?? null,
      primarySwellDirection: data.hourly?.wave_direction?.[closestIndex] ?? null,
      secondarySwellHeight: null,
      secondarySwellPeriod: null,
      secondarySwellDirection: null,
      windSpeed: data.hourly?.wind_speed_10m?.[closestIndex] ?? null,
      windDirection: data.hourly?.wind_direction_10m?.[closestIndex] ?? null,
      seaSurfaceTemp: data.hourly?.sea_surface_temperature?.[closestIndex] ?? null,
      timestamp: new Date(times[closestIndex]),
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

    // Find the closest hour to now
    const now = new Date();
    let closestHour = forecast.hourly[0];
    let minDiff = Infinity;

    for (const hour of forecast.hourly) {
      const hourTime = new Date(hour.time);
      const diff = Math.abs(hourTime.getTime() - now.getTime());
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
  const hourly: HourlyForecast[] = marineData.hourly.time.map((time, index) => ({
    time,
    timestamp: new Date(time),
    waveHeight: marineData.hourly.wave_height?.[index] ?? null,
    wavePeriod: marineData.hourly.wave_period?.[index] ?? null,
    waveDirection: marineData.hourly.wave_direction?.[index] ?? null,
    primarySwellHeight: marineData.hourly.swell_wave_height?.[index] ?? null,
    primarySwellPeriod: marineData.hourly.swell_wave_period?.[index] ?? null,
    primarySwellDirection: marineData.hourly.swell_wave_direction?.[index] ?? null,
    secondarySwellHeight: marineData.hourly.secondary_swell_wave_height?.[index] ?? null,
    secondarySwellPeriod: marineData.hourly.secondary_swell_wave_period?.[index] ?? null,
    secondarySwellDirection: marineData.hourly.secondary_swell_wave_direction?.[index] ?? null,
    windSpeed: weatherData?.hourly?.wind_speed_10m?.[index] ?? null,
    windDirection: weatherData?.hourly?.wind_direction_10m?.[index] ?? null,
    seaSurfaceTemp: weatherData?.hourly?.sea_surface_temperature?.[index] ?? null,
  }));

  return {
    latitude: marineData.latitude,
    longitude: marineData.longitude,
    hourly,
    fetchedAt: new Date(),
  };
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
 * Format wave height for display
 */
export function formatWaveHeight(meters: number | null): string {
  if (meters === null) return "N/A";
  return `${meters.toFixed(1)}m`;
}

/**
 * Format wave period for display
 */
export function formatWavePeriod(seconds: number | null): string {
  if (seconds === null) return "N/A";
  return `${seconds.toFixed(0)}s`;
}

/**
 * Format wind speed for display
 */
export function formatWindSpeed(kmh: number | null): string {
  if (kmh === null) return "N/A";
  return `${kmh.toFixed(0)} km/h`;
}

/**
 * Format temperature for display
 */
export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return "N/A";
  return `${celsius.toFixed(1)}°C`;
}
