"use client";

import { MarineConditions } from "@/types";
import {
  formatWaveHeight,
  formatWavePeriod,
  formatWindSpeed,
  formatTemperature,
  getDirectionText,
} from "@/lib/api/open-meteo";

interface ConditionsDisplayProps {
  conditions: MarineConditions;
  compact?: boolean;
}

export function ConditionsDisplay({ conditions, compact = false }: ConditionsDisplayProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-sm">
        {conditions.waveHeight !== null && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/15 text-blue-400">
            {formatWaveHeight(conditions.waveHeight)}
          </span>
        )}
        {conditions.primarySwellPeriod !== null && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-500/15 text-green-400">
            {formatWavePeriod(conditions.primarySwellPeriod)}
          </span>
        )}
        {conditions.windSpeed !== null && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-500/15 text-gray-400">
            {formatWindSpeed(conditions.windSpeed)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Wave Height */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Wave Height</div>
        <div className="text-lg font-semibold">{formatWaveHeight(conditions.waveHeight)}</div>
      </div>

      {/* Wave Period */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Wave Period</div>
        <div className="text-lg font-semibold">{formatWavePeriod(conditions.wavePeriod)}</div>
      </div>

      {/* Primary Swell */}
      {conditions.primarySwellHeight !== null && (
        <>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Primary Swell</div>
            <div className="text-lg font-semibold">
              {formatWaveHeight(conditions.primarySwellHeight)} @ {formatWavePeriod(conditions.primarySwellPeriod)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Swell Direction</div>
            <div className="text-lg font-semibold flex items-center gap-2">
              <DirectionArrow degrees={conditions.primarySwellDirection} />
              {getDirectionText(conditions.primarySwellDirection)}
              {conditions.primarySwellDirection !== null && (
                <span className="text-sm text-muted-foreground">({conditions.primarySwellDirection.toFixed(0)}°)</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Secondary Swell */}
      {conditions.secondarySwellHeight !== null && conditions.secondarySwellHeight > 0 && (
        <div className="col-span-2 space-y-1">
          <div className="text-sm text-muted-foreground">Secondary Swell</div>
          <div className="text-lg font-semibold">
            {formatWaveHeight(conditions.secondarySwellHeight)} @ {formatWavePeriod(conditions.secondarySwellPeriod)}{" "}
            from {getDirectionText(conditions.secondarySwellDirection)}
          </div>
        </div>
      )}

      {/* Wind */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">Wind</div>
        <div className="text-lg font-semibold flex items-center gap-2">
          {formatWindSpeed(conditions.windSpeed)}
          {conditions.windDirection !== null && (
            <>
              <DirectionArrow degrees={conditions.windDirection} />
              <span className="text-sm text-muted-foreground">
                {getDirectionText(conditions.windDirection)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Water Temp */}
      {conditions.seaSurfaceTemp !== null && (
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Water Temp</div>
          <div className="text-lg font-semibold">{formatTemperature(conditions.seaSurfaceTemp)}</div>
        </div>
      )}
    </div>
  );
}

function DirectionArrow({ degrees }: { degrees: number | null }) {
  if (degrees === null) return null;

  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${degrees}deg)` }}
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
