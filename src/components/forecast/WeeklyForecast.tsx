"use client";

import { useState, useEffect, useMemo } from "react";
import { HourlyForecast, MarineConditions } from "@/types";
import {
  formatWaveHeight,
  formatWavePeriod,
  getDirectionText,
  formatWindSpeed,
  formatTemperature,
  formatTideHeight,
} from "@/lib/api/open-meteo";
import { getEnergyLabel, getEnergyColor } from "@/lib/wave-energy";

type TimeWindow = "dawn" | "midday" | "afternoon";

interface WindowSummary {
  window: TimeWindow;
  label: string;
  swellHeight: number | null;
  swellPeriod: number | null;
  swellDirection: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDirection: number | null;
  tideMin: number | null;
  tideMax: number | null;
  airTemp: number | null;
  cloudCover: number | null;
  precipitation: number | null;
  waveEnergy: number | null;
}

interface DaySummary {
  date: string;
  label: string;
  windows: WindowSummary[];
}

interface WeeklyForecastProps {
  spotId: string;
}

export function WeeklyForecast({ spotId }: WeeklyForecastProps) {
  const [hourly, setHourly] = useState<HourlyForecast[] | null>(null);
  const [utcOffset, setUtcOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/spots/${spotId}/forecast`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) {
          setHourly(d.hourly);
          setUtcOffset(d.utcOffsetSeconds ?? 0);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [spotId]);

  const days = useMemo(() => {
    if (!hourly) return [];
    return buildDaySummaries(hourly, utcOffset);
  }, [hourly, utcOffset]);

  if (loading) return null;
  if (days.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Weekly Forecast</h3>

      <div className="rounded-lg border bg-background/60 overflow-hidden">
        {days.map((day) => {
          const isExpanded = expanded === day.date;

          return (
            <div key={day.date} className="border-b last:border-b-0">
              <button
                onClick={() => setExpanded(isExpanded ? null : day.date)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
              >
                <span className="text-xs font-medium w-12 shrink-0">
                  {day.label}
                </span>
                <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
                  {day.windows.map((w) => (
                    <ConditionPill key={w.window} window={w} />
                  ))}
                </div>
                <WindSummary windows={day.windows} />
              </button>

              {isExpanded && (
                <div className="px-3 pb-2.5 space-y-2">
                  {day.windows.map((w) => (
                    <WindowDetail key={w.window} window={w} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConditionPill({ window: w }: { window: WindowSummary }) {
  const label = w.window === "dawn" ? "AM" : w.window === "midday" ? "Mid" : "PM";
  const parts: string[] = [label];

  if (w.swellHeight != null) {
    const ft = (w.swellHeight * 3.28084).toFixed(0);
    parts.push(`${ft}ft`);
  }
  if (w.swellPeriod != null) {
    parts.push(`${w.swellPeriod.toFixed(0)}s`);
  }

  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground whitespace-nowrap">
      {parts.join(" ")}
    </span>
  );
}

function WindSummary({ windows }: { windows: WindowSummary[] }) {
  // Pick the midday window, or first available
  const w = windows.find((w) => w.window === "midday") ?? windows[0];
  if (!w || w.windSpeed == null) return null;

  const mph = (w.windSpeed * 0.621371).toFixed(0);
  const arrow = w.windDirection != null ? getWindArrow(w.windDirection) : "";

  return (
    <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
      {mph}mph {arrow}
    </span>
  );
}

function WindowDetail({ window: w }: { window: WindowSummary }) {
  const hasTide = w.tideMin != null || w.tideMax != null;

  return (
    <div className="rounded bg-muted/30 px-2.5 py-2 space-y-1.5">
      <span className="text-xs font-medium">{w.label}</span>

      {/* Swell */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-10 shrink-0">Swell</span>
        <span className="text-[10px]">
          {formatWaveHeight(w.swellHeight)} @ {formatWavePeriod(w.swellPeriod)}
          {w.swellDirection != null && (
            <> {getWindArrow(w.swellDirection)} {getDirectionText(w.swellDirection)}</>
          )}
        </span>
      </div>

      {/* Wind */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-10 shrink-0">Wind</span>
        <span className="text-[10px]">
          {formatWindSpeed(w.windSpeed)}
          {w.windGust != null && <> (gusts {formatWindSpeed(w.windGust)})</>}
          {w.windDirection != null && (
            <> {getWindArrow(w.windDirection)} {getDirectionText(w.windDirection)}</>
          )}
        </span>
      </div>

      {/* Tide */}
      {hasTide && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground w-10 shrink-0">Tide</span>
          <span className="text-[10px]">
            {formatTideHeight(w.tideMin)} – {formatTideHeight(w.tideMax)}
          </span>
        </div>
      )}

      {/* Weather */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground w-10 shrink-0">Wx</span>
        <span className="text-[10px]">
          {formatTemperature(w.airTemp)}
          {w.cloudCover != null && <> · {w.cloudCover.toFixed(0)}% cloud</>}
          {w.precipitation != null && w.precipitation > 0 && (
            <> · {(w.precipitation / 25.4).toFixed(2)}in rain</>
          )}
        </span>
      </div>

      {/* Energy */}
      {w.waveEnergy != null && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground w-10 shrink-0">Energy</span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `color-mix(in oklch, ${getEnergyColor(w.waveEnergy)} 20%, transparent)`,
              color: getEnergyColor(w.waveEnergy),
            }}
          >
            {getEnergyLabel(w.waveEnergy)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function getWindArrow(degrees: number): string {
  // Wind comes FROM this direction, arrow points where it's going
  const arrows = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
  const index = Math.round(degrees / 45) % 8;
  return arrows[index];
}

function getLocalHour(timeStr: string): number {
  const match = timeStr.match(/T(\d{2}):/);
  return match ? parseInt(match[1], 10) : 0;
}

function getTimeWindow(hour: number): TimeWindow | null {
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 14) return "midday";
  if (hour >= 14 && hour < 19) return "afternoon";
  return null;
}

function getWindowLabel(w: TimeWindow): string {
  if (w === "dawn") return "Morning";
  if (w === "midday") return "Midday";
  return "Afternoon";
}

function getDayLabel(dateStr: string, todayStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(ty, tm - 1, td);
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Tmrw";
  const date = new Date(target);
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function buildDaySummaries(
  hourly: HourlyForecast[],
  utcOffsetSeconds: number
): DaySummary[] {
  const now = new Date();
  const nowLocalMs = now.getTime() + utcOffsetSeconds * 1000;
  const today = new Date(nowLocalMs);
  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

  // Group hours by date + window, skip past hours and non-daylight
  const groups = new Map<string, HourlyForecast[]>();

  for (const h of hourly) {
    const ts = new Date(h.timestamp).getTime();
    if (ts + 3600000 <= nowLocalMs) continue; // skip past

    const hour = getLocalHour(h.time);
    const window = getTimeWindow(hour);
    if (!window) continue;

    const date = h.time.slice(0, 10);
    const key = `${date}:${window}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(h);
  }

  // Build per-date summaries
  const dateMap = new Map<string, WindowSummary[]>();

  for (const [key, hours] of groups) {
    const [date, window] = key.split(":") as [string, TimeWindow];
    if (!dateMap.has(date)) dateMap.set(date, []);

    // Pick the middle hour as representative
    const mid = hours[Math.floor(hours.length / 2)];

    // Tide range across the window
    const tides = hours.map((h) => h.tideHeight).filter((t): t is number => t != null);
    const tideMin = tides.length > 0 ? Math.min(...tides) : null;
    const tideMax = tides.length > 0 ? Math.max(...tides) : null;

    dateMap.get(date)!.push({
      window,
      label: getWindowLabel(window),
      swellHeight: mid.primarySwellHeight,
      swellPeriod: mid.primarySwellPeriod,
      swellDirection: mid.primarySwellDirection,
      windSpeed: mid.windSpeed,
      windGust: mid.windGust,
      windDirection: mid.windDirection,
      tideMin,
      tideMax,
      airTemp: mid.airTemp,
      cloudCover: mid.cloudCover,
      precipitation: mid.precipitation,
      waveEnergy: mid.waveEnergy,
    });
  }

  const order: Record<TimeWindow, number> = { dawn: 0, midday: 1, afternoon: 2 };
  const sortedDates = [...dateMap.keys()].sort().slice(0, 5);

  return sortedDates.map((date) => {
    const windows = dateMap.get(date)!;
    windows.sort((a, b) => order[a.window] - order[b.window]);
    return {
      date,
      label: getDayLabel(date, todayStr),
      windows,
    };
  });
}
