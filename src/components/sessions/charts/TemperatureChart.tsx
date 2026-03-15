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
import { HourlyForecast } from "@/types";
import { celsiusToFahrenheit } from "@/lib/api/open-meteo";

interface TemperatureChartProps {
  data: HourlyForecast[];
  sessionIndex: number;
}

export function TemperatureChart({ data, sessionIndex }: TemperatureChartProps) {
  const chartData = data.map((h) => ({
    time: h.time,
    "Air Temp": celsiusToFahrenheit(h.airTemp) ?? undefined,
    "Water Temp": celsiusToFahrenheit(h.seaSurfaceTemp) ?? undefined,
  }));

  return (
    <ChartShell data={chartData} sessionIndex={sessionIndex} title="Temperature (\u00B0F)">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <SharedGrid />
          <SharedXAxis />
          <SharedYAxis
            tickFormatter={(v) => `${v.toFixed(0)}\u00B0`}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <SessionMarkers data={chartData} sessionIndex={sessionIndex} />
          <Line
            type="monotone"
            dataKey="Air Temp"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="Water Temp"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
