"use client";

import {
  ComposedChart,
  Area,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import {
  ChartShell,
  SharedXAxis,
  SharedYAxis,
  SharedGrid,
  SessionMarkers,
  CustomTooltip,
  axisColor,
} from "./TimelineChart";
import { DirectionStrip } from "./DirectionStrip";
import { HourlyForecast } from "@/types";
import { metersToFeet } from "@/lib/api/open-meteo";

interface SwellChartProps {
  data: HourlyForecast[];
  sessionIndex: number;
}

export function SwellChart({ data, sessionIndex }: SwellChartProps) {
  const chartData = data.map((h) => ({
    time: h.time,
    "Swell Height": metersToFeet(h.primarySwellHeight) ?? undefined,
    "Swell Period": h.primarySwellPeriod ?? undefined,
  }));

  const directions = data.map((h) => h.primarySwellDirection);

  return (
    <div>
      <ChartShell data={chartData} sessionIndex={sessionIndex} title="Swell (ft / s)">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <SharedGrid />
            <SharedXAxis />
            <SharedYAxis
              yAxisId="left"
              tickFormatter={(v) => `${v.toFixed(1)}`}
              domain={[0, "auto"]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}s`}
              domain={[0, "auto"]}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <SessionMarkers data={chartData} sessionIndex={sessionIndex} />
            <Area
              type="monotone"
              dataKey="Swell Height"
              yAxisId="left"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Swell Period"
              yAxisId="right"
              stroke="var(--chart-3)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartShell>
      <DirectionStrip directions={directions} sessionIndex={sessionIndex} />
    </div>
  );
}
