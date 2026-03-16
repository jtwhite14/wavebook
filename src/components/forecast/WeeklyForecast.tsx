"use client";

import { useState, useEffect, useMemo } from "react";
import { HourlyForecast, MarineConditions, MatchDetails, TimeWindow } from "@/types";
import {
  formatWaveHeight,
  formatWavePeriod,
  getDirectionText,
  formatWindSpeed,
  formatTemperature,
  formatTideHeight,
} from "@/lib/api/open-meteo";
import { getEnergyLabel, getEnergyColor } from "@/lib/wave-energy";

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

interface WindowScore {
  window: TimeWindow;
  bestScore: number;
  matchScore: number;
  forecastConfidence: number;
  ratingBoost: number;
  matchedSessionRating: number | null;
  matchDetails: MatchDetails | null;
  forecastSnapshot: MarineConditions | null;
  blocked: "exposure" | "coverage" | null;
}

interface DayScore {
  date: string;
  label: string;
  windows: WindowScore[];
}

interface ScoresData {
  days: DayScore[];
  sessionCount: number;
  seasonalSessionCount: number;
  ignoredCount: number;
  threshold: number;
  message?: string;
}

interface WeeklyForecastProps {
  spotId: string;
}

export function WeeklyForecast({ spotId }: WeeklyForecastProps) {
  const [hourly, setHourly] = useState<HourlyForecast[] | null>(null);
  const [utcOffset, setUtcOffset] = useState(0);
  const [scores, setScores] = useState<ScoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const opts = { signal: controller.signal };

    Promise.all([
      fetch(`/api/spots/${spotId}/forecast`, opts).then(r => r.ok ? r.json() : null),
      fetch(`/api/spots/${spotId}/forecast-scores`, opts).then(r => r.ok ? r.json() : null),
    ])
      .then(([forecastData, scoresData]) => {
        if (forecastData) {
          setHourly(forecastData.hourly);
          setUtcOffset(forecastData.utcOffsetSeconds ?? 0);
        }
        if (scoresData) setScores(scoresData);
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

  // Build a lookup: date -> window -> WindowScore
  const scoreMap = useMemo(() => {
    const map = new Map<string, Map<TimeWindow, WindowScore>>();
    if (!scores) return map;
    for (const day of scores.days) {
      const windowMap = new Map<TimeWindow, WindowScore>();
      for (const w of day.windows) windowMap.set(w.window, w);
      map.set(day.date, windowMap);
    }
    return map;
  }, [scores]);

  const threshold = scores?.threshold ?? 0;

  if (loading) return null;
  if (days.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Weekly Forecast</h3>
        {scores && scores.seasonalSessionCount > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {scores.seasonalSessionCount} session{scores.seasonalSessionCount !== 1 ? "s" : ""} matched
          </span>
        )}
      </div>

      <div className="rounded-lg border bg-background/60 overflow-hidden">
        {days.map((day) => {
          const isExpanded = expanded === day.date;
          const dayScores = scoreMap.get(day.date);
          // Best score for the day
          let bestScore: number | null = null;
          if (dayScores) {
            for (const ws of dayScores.values()) {
              if (!ws.blocked && (bestScore === null || ws.bestScore > bestScore)) {
                bestScore = ws.bestScore;
              }
            }
          }

          return (
            <div key={day.date} className="border-b last:border-b-0">
              <button
                onClick={() => setExpanded(isExpanded ? null : day.date)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
              >
                <span className="text-xs font-medium w-10 shrink-0">
                  {day.label}
                </span>
                <div className="flex-1 flex items-center gap-1 overflow-hidden">
                  {day.windows.map((w) => (
                    <ConditionPill
                      key={w.window}
                      window={w}
                      score={dayScores?.get(w.window) ?? null}
                      threshold={threshold}
                    />
                  ))}
                </div>
                {bestScore !== null && (
                  <ScoreBadge score={bestScore} threshold={threshold} />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-2.5 space-y-2">
                  {day.windows.map((w) => (
                    <WindowDetail
                      key={w.window}
                      window={w}
                      score={dayScores?.get(w.window) ?? null}
                      threshold={threshold}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {threshold > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Alerts fire at {threshold}+. Tap a day to see details.
        </p>
      )}
    </div>
  );
}

function ConditionPill({
  window: w,
  score,
  threshold,
}: {
  window: WindowSummary;
  score: WindowScore | null;
  threshold: number;
}) {
  const label = w.window === "dawn" ? "AM" : w.window === "midday" ? "Mid" : "PM";
  const parts: string[] = [];

  if (w.swellHeight != null) {
    const ft = (w.swellHeight * 3.28084).toFixed(0);
    parts.push(`${ft}ft`);
  }
  if (w.swellPeriod != null) {
    parts.push(`${w.swellPeriod.toFixed(0)}s`);
  }

  // Determine color based on score
  let colorClass = "bg-muted/50 text-muted-foreground";
  if (score && !score.blocked && threshold > 0) {
    const s = Math.round(score.bestScore);
    if (s >= threshold) {
      colorClass = "bg-primary/15 text-primary";
    } else if (s >= threshold * 0.85) {
      colorClass = "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400";
    }
  }
  if (score?.blocked === "exposure") {
    colorClass = "bg-muted/50 text-muted-foreground line-through";
  }

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${colorClass}`}>
      {label} {parts.join(" ")}
      {score && !score.blocked && threshold > 0 && (
        <span className="ml-0.5 opacity-70">{Math.round(score.bestScore)}</span>
      )}
    </span>
  );
}

function ScoreBadge({ score, threshold }: { score: number; threshold: number }) {
  const rounded = Math.round(score);
  const color = rounded >= threshold
    ? "text-primary"
    : rounded >= threshold * 0.85
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-muted-foreground";

  return (
    <span className={`text-xs font-semibold tabular-nums shrink-0 ${color}`}>
      {rounded}
    </span>
  );
}

function WindSummary({ windows }: { windows: WindowSummary[] }) {
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

function WindowDetail({
  window: w,
  score,
  threshold,
}: {
  window: WindowSummary;
  score: WindowScore | null;
  threshold: number;
}) {
  const hasTide = w.tideMin != null || w.tideMax != null;
  const scoreVal = score ? Math.round(score.bestScore) : null;
  const aboveThreshold = scoreVal != null && scoreVal >= threshold;

  return (
    <div className="rounded bg-muted/30 px-2.5 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium">{w.label}</span>
        <div className="flex items-center gap-2">
          {score?.matchedSessionRating && (
            <span className="text-[10px] text-muted-foreground">
              vs {"\u2605"}{score.matchedSessionRating}
            </span>
          )}
          {scoreVal != null && threshold > 0 && (
            <span className={`text-[10px] font-semibold tabular-nums ${aboveThreshold ? "text-primary" : "text-muted-foreground"}`}>
              {scoreVal}/{threshold}
            </span>
          )}
        </div>
      </div>

      {/* Blocked message */}
      {score?.blocked === "exposure" && (
        <p className="text-[10px] text-muted-foreground mb-1.5">Swell direction blocked by exposure settings</p>
      )}
      {score?.blocked === "coverage" && (
        <p className="text-[10px] text-muted-foreground mb-1.5">Not enough condition data (&lt;50% coverage)</p>
      )}

      {/* Conditions grid — 2 columns */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {/* Swell */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">Swell</span>
          <span className="text-[10px] truncate">
            {formatWaveHeight(w.swellHeight)} @ {formatWavePeriod(w.swellPeriod)}
          </span>
        </div>

        {/* Wind */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">Wind</span>
          <span className="text-[10px] truncate">
            {formatWindSpeed(w.windSpeed)}
            {w.windDirection != null && <> {getWindArrow(w.windDirection)} {getDirectionText(w.windDirection)}</>}
          </span>
        </div>

        {/* Swell direction */}
        {w.swellDirection != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground w-8 shrink-0">Dir</span>
            <span className="text-[10px] truncate">
              {getWindArrow(w.swellDirection)} {getDirectionText(w.swellDirection)}
            </span>
          </div>
        )}

        {/* Tide */}
        {hasTide && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground w-8 shrink-0">Tide</span>
            <span className="text-[10px] truncate">
              {formatTideHeight(w.tideMin)} – {formatTideHeight(w.tideMax)}
            </span>
          </div>
        )}

        {/* Weather */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">Wx</span>
          <span className="text-[10px] truncate">
            {formatTemperature(w.airTemp)}
            {w.cloudCover != null && <> · {w.cloudCover.toFixed(0)}%</>}
            {w.precipitation != null && w.precipitation > 0 && (
              <> · {(w.precipitation / 25.4).toFixed(2)}in</>
            )}
          </span>
        </div>

        {/* Energy */}
        {w.waveEnergy != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground w-8 shrink-0">NRG</span>
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

      {/* Score breakdown bars — only when scores are available */}
      {score?.matchDetails && !score.blocked && (
        <div className="mt-1.5 pt-1.5 border-t border-border/50">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <ScoreBar label="Swell ht" value={score.matchDetails.swellHeight} />
            <ScoreBar label="Wind spd" value={score.matchDetails.windSpeed} />
            <ScoreBar label="Swell per" value={score.matchDetails.swellPeriod} />
            <ScoreBar label="Wind dir" value={score.matchDetails.windDirection} />
            <ScoreBar label="Swell dir" value={score.matchDetails.swellDirection} />
            <ScoreBar label="Tide" value={score.matchDetails.tideHeight} />
            <ScoreBar label="Energy" value={score.matchDetails.waveEnergy} />
          </div>
          <div className="flex items-center gap-3 mt-1 pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">
              Confidence {(score.matchDetails.forecastConfidence * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              Rating boost {(score.matchDetails.ratingBoost * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;

  const pct = Math.round(value * 100);
  const color = pct >= 80
    ? "bg-primary/60"
    : pct >= 50
      ? "bg-yellow-500/60"
      : "bg-destructive/40";

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-6 text-right">{pct}</span>
    </div>
  );
}

// ── Helpers ──

function getWindArrow(degrees: number): string {
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

  const groups = new Map<string, HourlyForecast[]>();

  for (const h of hourly) {
    const ts = new Date(h.timestamp).getTime();
    if (ts + 3600000 <= nowLocalMs) continue;

    const hour = getLocalHour(h.time);
    const window = getTimeWindow(hour);
    if (!window) continue;

    const date = h.time.slice(0, 10);
    const key = `${date}:${window}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(h);
  }

  const dateMap = new Map<string, WindowSummary[]>();

  for (const [key, hours] of groups) {
    const [date, window] = key.split(":") as [string, TimeWindow];
    if (!dateMap.has(date)) dateMap.set(date, []);

    const mid = hours[Math.floor(hours.length / 2)];

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
