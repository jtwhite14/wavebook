"use client";

import { HourlyForecast } from "@/types";
import { celsiusToFahrenheit } from "@/lib/api/open-meteo";
import { formatHour, sessionColor } from "./TimelineChart";

interface WeatherStripProps {
  data: HourlyForecast[];
  sessionIndex: number;
}

/**
 * Map WMO weather code + day/night to an SVG weather icon.
 * Codes: https://www.noaa.gov/weather/wmo-weather-interpretation-codes
 */
function WeatherIcon({
  code,
  isDay,
  size = 24,
}: {
  code: number | null;
  isDay: boolean;
  size?: number;
}) {
  const s = size;
  const col = "currentColor";

  // Fallback: question mark
  if (code == null) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="text-white/20">
        <circle cx="12" cy="12" r="4" fill={col} opacity={0.3} />
      </svg>
    );
  }

  // Clear sky (0)
  if (code === 0) {
    if (isDay) {
      // Sun
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="text-amber-400">
          <circle cx="12" cy="12" r="5" fill={col} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 12 + 7.5 * Math.cos(rad);
            const y1 = 12 + 7.5 * Math.sin(rad);
            const x2 = 12 + 9.5 * Math.cos(rad);
            const y2 = 12 + 9.5 * Math.sin(rad);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={col}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      );
    }
    // Moon (crescent)
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="text-slate-400">
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
          fill={col}
        />
      </svg>
    );
  }

  // Mainly clear (1)
  if (code === 1) {
    if (isDay) {
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="text-amber-400">
          <circle cx="10" cy="10" r="4" fill={col} />
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <line
                key={angle}
                x1={10 + 5.5 * Math.cos(rad)}
                y1={10 + 5.5 * Math.sin(rad)}
                x2={10 + 7 * Math.cos(rad)}
                y2={10 + 7 * Math.sin(rad)}
                stroke={col}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            );
          })}
          <path
            d="M14 18a4 4 0 0 1-4-1h10a4 4 0 0 1-6 1Z"
            fill="currentColor"
            className="text-white/20"
          />
        </svg>
      );
    }
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="text-slate-400">
        <path d="M19 12.79A7 7 0 1 1 11.21 5a5.5 5.5 0 0 0 7.79 7.79Z" fill={col} />
      </svg>
    );
  }

  // Partly cloudy (2)
  if (code === 2) {
    if (isDay) {
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="10" cy="8" r="3.5" fill="currentColor" className="text-amber-400" />
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            return (
              <line
                key={angle}
                x1={10 + 5 * Math.cos(rad)}
                y1={8 + 5 * Math.sin(rad)}
                x2={10 + 6.2 * Math.cos(rad)}
                y2={8 + 6.2 * Math.sin(rad)}
                stroke="currentColor"
                className="text-amber-400"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            );
          })}
          <path
            d="M7 20a4 4 0 0 1-.3-8 5 5 0 0 1 9.9 1.2A3 3 0 0 1 18 20H7Z"
            fill="currentColor"
            className="text-white/40"
          />
        </svg>
      );
    }
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M17 7.79A5 5 0 1 1 11.21 2a4 4 0 0 0 5.79 5.79Z" fill="currentColor" className="text-slate-400" />
        <path
          d="M7 20a4 4 0 0 1-.3-8 5 5 0 0 1 9.9 1.2A3 3 0 0 1 18 20H7Z"
          fill="currentColor"
          className="text-white/30"
        />
      </svg>
    );
  }

  // Overcast (3)
  if (code === 3) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="text-white/40">
        <path
          d="M6 19a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.7 1A3.5 3.5 0 0 1 19 19H6Z"
          fill={col}
        />
      </svg>
    );
  }

  // Fog (45, 48)
  if (code === 45 || code === 48) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="text-white/30">
        <line x1="4" y1="8" x2="20" y2="8" stroke={col} strokeWidth={2} strokeLinecap="round" />
        <line x1="6" y1="12" x2="18" y2="12" stroke={col} strokeWidth={2} strokeLinecap="round" />
        <line x1="4" y1="16" x2="20" y2="16" stroke={col} strokeWidth={2} strokeLinecap="round" />
      </svg>
    );
  }

  // Drizzle (51, 53, 55)
  if (code >= 51 && code <= 55) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 14a4 4 0 0 1-.3-8 5 5 0 0 1 9.9 1.2A3 3 0 0 1 18 14H6Z"
          fill="currentColor"
          className="text-white/35"
        />
        <line x1="8" y1="17" x2="7" y2="20" stroke="currentColor" className="text-blue-400/60" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="13" y1="17" x2="12" y2="20" stroke="currentColor" className="text-blue-400/60" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }

  // Rain (61, 63, 65)
  if (code >= 61 && code <= 65) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 13a4 4 0 0 1-.3-8 5 5 0 0 1 9.9 1.2A3 3 0 0 1 18 13H6Z"
          fill="currentColor"
          className="text-white/40"
        />
        <line x1="8" y1="16" x2="6.5" y2="20" stroke="currentColor" className="text-blue-400" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="12" y1="16" x2="10.5" y2="20" stroke="currentColor" className="text-blue-400" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="16" y1="16" x2="14.5" y2="20" stroke="currentColor" className="text-blue-400" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }

  // Freezing rain (66, 67)
  if (code === 66 || code === 67) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 13a4 4 0 0 1-.3-8 5 5 0 0 1 9.9 1.2A3 3 0 0 1 18 13H6Z"
          fill="currentColor"
          className="text-white/40"
        />
        <line x1="8" y1="16" x2="7" y2="20" stroke="currentColor" className="text-cyan-400" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="13" y1="16" x2="12" y2="20" stroke="currentColor" className="text-cyan-400" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }

  // Snow (71, 73, 75, 77)
  if (code >= 71 && code <= 77) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 13a4 4 0 0 1-.3-8 5 5 0 0 1 9.9 1.2A3 3 0 0 1 18 13H6Z"
          fill="currentColor"
          className="text-white/40"
        />
        <circle cx="8" cy="17" r="1.2" fill="currentColor" className="text-white/60" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" className="text-white/60" />
        <circle cx="16" cy="17" r="1.2" fill="currentColor" className="text-white/60" />
      </svg>
    );
  }

  // Rain showers (80, 81, 82)
  if (code >= 80 && code <= 82) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 12a4 4 0 0 1-.3-8 5 5 0 0 1 9.9 1.2A3 3 0 0 1 18 12H6Z"
          fill="currentColor"
          className="text-slate-500"
        />
        <line x1="7" y1="15" x2="5.5" y2="19" stroke="currentColor" className="text-blue-400" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="11" y1="15" x2="9.5" y2="19" stroke="currentColor" className="text-blue-400" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="15" y1="15" x2="13.5" y2="19" stroke="currentColor" className="text-blue-400" strokeWidth={1.5} strokeLinecap="round" />
        <line x1="19" y1="15" x2="17.5" y2="19" stroke="currentColor" className="text-blue-400" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }

  // Thunderstorm (95, 96, 99)
  if (code >= 95) {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 12a4 4 0 0 1-.3-8 5 5 0 0 1 9.9 1.2A3 3 0 0 1 18 12H6Z"
          fill="currentColor"
          className="text-slate-500"
        />
        <path
          d="M13 14l-2 4h3l-2 4"
          stroke="currentColor"
          className="text-amber-400"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Default cloud
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="text-white/30">
      <path
        d="M6 19a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.7 1A3.5 3.5 0 0 1 19 19H6Z"
        fill={col}
      />
    </svg>
  );
}

export function WeatherStrip({ data, sessionIndex }: WeatherStripProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h3 className="text-[13px] font-medium text-white/40 tracking-wide mb-4">
        WEATHER
      </h3>
      <div className="overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex">
          {data.map((hour, i) => {
            const isSession = i === sessionIndex;
            const tempF = celsiusToFahrenheit(hour.airTemp);
            const isDay = hour.isDay ?? ((() => {
              const h = new Date(hour.time).getHours();
              return h >= 6 && h < 20;
            })());

            return (
              <div
                key={hour.time}
                className={`
                  flex flex-col items-center gap-2 px-3 py-3 min-w-[56px] rounded-xl
                  transition-colors
                  ${isSession
                    ? "bg-white/[0.08] ring-1 ring-inset ring-amber-400/40"
                    : "hover:bg-white/[0.03]"
                  }
                `}
              >
                {/* Hour label */}
                <span
                  className={`text-[11px] font-medium tabular-nums ${
                    isSession ? "text-white/70" : "text-white/30"
                  }`}
                >
                  {formatHour(hour.time)}
                </span>

                {/* Weather icon */}
                <WeatherIcon code={hour.weatherCode} isDay={isDay} size={22} />

                {/* Temperature */}
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    isSession ? "text-white" : "text-white/60"
                  }`}
                >
                  {tempF != null ? `${tempF.toFixed(0)}\u00B0` : "\u2014"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
