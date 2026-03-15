"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ChartPanel,
  SharedXAxis,
  SharedYAxis,
  SessionMarker,
  CustomTooltip,
} from "./TimelineChart";
import { HourlyForecast } from "@/types";

interface TideChartProps {
  data: HourlyForecast[];
  sessionIndex: number;
}

const cTide = "oklch(0.72 0.14 220)"; // ocean blue

export function TideChart({ data, sessionIndex }: TideChartProps) {
  // Only render if we have tide data for at least one hour
  const hasTideData = data.some((h) => h.tideHeight != null);
  if (!hasTideData) return null;

  const chartData = data.map((h) => ({
    time: h.time,
    Tide: h.tideHeight ?? undefined,
  }));

  const sessionTide = chartData[sessionIndex]?.Tide;

  return (
    <ChartPanel
      title="TIDE HEIGHT"
      heroValue={sessionTide != null ? sessionTide.toFixed(1) : "—"}
      heroUnit="ft"
      heroSub="relative to MLLW"
      legends={[{ label: "Tide", color: cTide }]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradTide" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cTide} stopOpacity={0.25} />
              <stop offset="100%" stopColor={cTide} stopOpacity={0} />
            </linearGradient>
          </defs>
          <SharedXAxis />
          <SharedYAxis
            tickFormatter={(v) => `${v.toFixed(1)}`}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <SessionMarker data={chartData} sessionIndex={sessionIndex} />
          <Area
            type="natural"
            dataKey="Tide"
            stroke={cTide}
            fill="url(#gradTide)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: cTide, stroke: "none" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
