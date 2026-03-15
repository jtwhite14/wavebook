"use client";

import {
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ChartShell,
  SharedXAxis,
  SharedYAxis,
  SharedGrid,
  SessionMarkers,
  CustomTooltip,
} from "./TimelineChart";
import { DirectionStrip } from "./DirectionStrip";
import { HourlyForecast } from "@/types";
import { kmhToMph } from "@/lib/api/open-meteo";

interface WindChartProps {
  data: HourlyForecast[];
  sessionIndex: number;
}

export function WindChart({ data, sessionIndex }: WindChartProps) {
  const chartData = data.map((h) => ({
    time: h.time,
    "Wind Speed": kmhToMph(h.windSpeed) ?? undefined,
    "Wind Gust": kmhToMph(h.windGust) ?? undefined,
  }));

  const directions = data.map((h) => h.windDirection);

  return (
    <div>
      <ChartShell data={chartData} sessionIndex={sessionIndex} title="Wind (mph)">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <SharedGrid />
            <SharedXAxis />
            <SharedYAxis
              tickFormatter={(v) => `${v.toFixed(0)}`}
              domain={[0, "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <SessionMarkers data={chartData} sessionIndex={sessionIndex} />
            <Line
              type="monotone"
              dataKey="Wind Speed"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Wind Gust"
              stroke="var(--chart-3)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartShell>
      <DirectionStrip directions={directions} sessionIndex={sessionIndex} />
    </div>
  );
}
