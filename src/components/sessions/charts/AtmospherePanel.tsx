"use client";

import {
  ComposedChart,
  Line,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { HourlyForecast } from "@/types";
import { hpaToInHg, metersToMiles, mmToInches } from "@/lib/api/open-meteo";

interface AtmospherePanelProps {
  data: HourlyForecast[];
  sessionIndex: number;
}

const sessionColor = "oklch(0.82 0.17 90)";

function Sparkline({
  data,
  dataKey,
  label,
  unit,
  sessionIndex,
  color,
  formatter,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  label: string;
  unit: string;
  sessionIndex: number;
  color: string;
  formatter?: (v: number) => string;
}) {
  const sessionValue = data[sessionIndex]?.[dataKey];
  const formatted = sessionValue != null && typeof sessionValue === "number"
    ? (formatter ? formatter(sessionValue) : sessionValue.toFixed(1))
    : "N/A";

  const sessionTime = data[sessionIndex]?.time as string | undefined;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">
          {formatted} {unit}
        </span>
      </div>
      <div className="h-[50px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            {sessionTime && (
              <ReferenceLine
                x={sessionTime}
                stroke={sessionColor}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AtmospherePanel({ data, sessionIndex }: AtmospherePanelProps) {
  const chartData = data.map((h) => ({
    time: h.time,
    Humidity: h.humidity ?? undefined,
    Precipitation: mmToInches(h.precipitation) ?? undefined,
    Pressure: hpaToInHg(h.pressureMsl) ?? undefined,
    "Cloud Cover": h.cloudCover ?? undefined,
    Visibility: metersToMiles(h.visibility) ?? undefined,
  }));

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">Atmosphere</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Sparkline
          data={chartData}
          dataKey="Humidity"
          label="Humidity"
          unit="%"
          sessionIndex={sessionIndex}
          color="var(--chart-2)"
        />
        <Sparkline
          data={chartData}
          dataKey="Precipitation"
          label="Precip."
          unit="in"
          sessionIndex={sessionIndex}
          color="var(--chart-4)"
          formatter={(v) => v.toFixed(2)}
        />
        <Sparkline
          data={chartData}
          dataKey="Pressure"
          label="Pressure"
          unit="inHg"
          sessionIndex={sessionIndex}
          color="var(--chart-5)"
          formatter={(v) => v.toFixed(2)}
        />
        <Sparkline
          data={chartData}
          dataKey="Cloud Cover"
          label="Cloud Cover"
          unit="%"
          sessionIndex={sessionIndex}
          color="var(--chart-3)"
        />
        <Sparkline
          data={chartData}
          dataKey="Visibility"
          label="Visibility"
          unit="mi"
          sessionIndex={sessionIndex}
          color="var(--chart-1)"
        />
      </div>
    </div>
  );
}
