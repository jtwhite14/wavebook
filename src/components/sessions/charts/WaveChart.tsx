"use client";

import {
  ComposedChart,
  Area,
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
import { metersToFeet } from "@/lib/api/open-meteo";

interface WaveChartProps {
  data: HourlyForecast[];
  sessionIndex: number;
}

export function WaveChart({ data, sessionIndex }: WaveChartProps) {
  const chartData = data.map((h) => ({
    time: h.time,
    "Sig. Wave Height": metersToFeet(h.waveHeight) ?? undefined,
    "Wind Wave Height": metersToFeet(h.windWaveHeight) ?? undefined,
  }));

  return (
    <ChartShell data={chartData} sessionIndex={sessionIndex} title="Wave Heights (ft)">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <SharedGrid />
          <SharedXAxis />
          <SharedYAxis
            tickFormatter={(v) => `${v.toFixed(1)}`}
            domain={[0, "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <SessionMarkers data={chartData} sessionIndex={sessionIndex} />
          <Area
            type="monotone"
            dataKey="Sig. Wave Height"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="Wind Wave Height"
            stroke="var(--chart-2)"
            fill="var(--chart-2)"
            fillOpacity={0.1}
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
