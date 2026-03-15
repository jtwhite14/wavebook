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
  formatHour,
} from "./TimelineChart";
import { HourlyForecast } from "@/types";
import { getEnergyLabel, getEnergyColor, formatWaveEnergy } from "@/lib/wave-energy";

interface EnergyChartProps {
  data: HourlyForecast[];
  sessionIndex: number;
}

const cEnergy = "oklch(0.72 0.16 55)"; // warm orange

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EnergyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const kj = payload[0]?.value as number | undefined;
  return (
    <div className="backdrop-blur-xl bg-black/70 border border-white/10 rounded-xl px-3.5 py-2.5 shadow-2xl">
      <p className="text-[11px] text-white/50 mb-1.5 font-medium tracking-wide uppercase">
        {formatHour(label)}
      </p>
      <div className="flex items-center gap-2 py-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: kj != null ? getEnergyColor(kj) : cEnergy }}
        />
        <span className="text-white/60 text-xs">Energy</span>
        <span className="text-white text-xs font-medium ml-auto tabular-nums">
          {formatWaveEnergy(kj ?? null)}
        </span>
      </div>
      {kj != null && (
        <p className="text-[10px] text-white/40 mt-1">{getEnergyLabel(kj)}</p>
      )}
    </div>
  );
}

export function EnergyChart({ data, sessionIndex }: EnergyChartProps) {
  const hasEnergyData = data.some((h) => h.waveEnergy != null);
  if (!hasEnergyData) return null;

  const chartData = data.map((h) => ({
    time: h.time,
    Energy: h.waveEnergy ?? undefined,
  }));

  const sessionEnergy = chartData[sessionIndex]?.Energy ?? null;
  const label = getEnergyLabel(sessionEnergy);
  const heroColor = getEnergyColor(sessionEnergy);

  return (
    <ChartPanel
      title="WAVE ENERGY"
      heroValue={sessionEnergy != null ? formatWaveEnergy(sessionEnergy) : "—"}
      heroSub={sessionEnergy != null ? label : undefined}
      legends={[{ label: "Energy", color: cEnergy }]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradEnergy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={heroColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={heroColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <SharedXAxis />
          <SharedYAxis
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
            domain={[0, "auto"]}
          />
          <Tooltip content={<EnergyTooltip />} cursor={false} />
          <SessionMarker data={chartData} sessionIndex={sessionIndex} />
          <Area
            type="natural"
            dataKey="Energy"
            stroke={cEnergy}
            fill="url(#gradEnergy)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: cEnergy, stroke: "none" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
