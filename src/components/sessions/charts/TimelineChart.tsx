"use client";

import { ReactNode } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

const gridColor = "oklch(1 0 0 / 6%)";
const axisColor = "oklch(0.65 0 0)";
const sessionColor = "oklch(0.82 0.17 90)";

function formatHour(time: string) {
  const d = new Date(time);
  const h = d.getHours();
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground mb-1">{formatHour(label)}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : "N/A"}
        </p>
      ))}
    </div>
  );
}

export function ChartShell({
  title,
  children,
}: {
  data: Record<string, unknown>[];
  sessionIndex: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="h-[200px] w-full">
        {children}
      </div>
    </div>
  );
}

export { gridColor, axisColor, sessionColor, formatHour, CustomTooltip };

export function SessionMarkers({
  data,
  sessionIndex,
}: {
  data: Record<string, unknown>[];
  sessionIndex: number;
}) {
  const sessionTime = data[sessionIndex]?.time as string | undefined;
  const prevTime = sessionIndex > 0 ? (data[sessionIndex - 1]?.time as string) : sessionTime;
  const nextTime =
    sessionIndex < data.length - 1 ? (data[sessionIndex + 1]?.time as string) : sessionTime;

  const bandLeft = prevTime && sessionTime
    ? new Date((new Date(prevTime).getTime() + new Date(sessionTime).getTime()) / 2).toISOString()
    : sessionTime;
  const bandRight = nextTime && sessionTime
    ? new Date((new Date(nextTime).getTime() + new Date(sessionTime).getTime()) / 2).toISOString()
    : sessionTime;

  return (
    <>
      {bandLeft && bandRight && (
        <ReferenceArea
          x1={bandLeft}
          x2={bandRight}
          fill={sessionColor}
          fillOpacity={0.08}
        />
      )}
      {sessionTime && (
        <ReferenceLine
          x={sessionTime}
          stroke={sessionColor}
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}
    </>
  );
}

export function SharedXAxis() {
  return (
    <XAxis
      dataKey="time"
      tickFormatter={formatHour}
      tick={{ fill: axisColor, fontSize: 11 }}
      axisLine={{ stroke: gridColor }}
      tickLine={false}
      interval="preserveStartEnd"
    />
  );
}

export function SharedYAxis({
  tickFormatter,
  domain,
  yAxisId,
  orientation,
}: {
  tickFormatter?: (v: number) => string;
  domain?: [number | string, number | string];
  yAxisId?: string;
  orientation?: "left" | "right";
}) {
  return (
    <YAxis
      yAxisId={yAxisId}
      orientation={orientation}
      tick={{ fill: axisColor, fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      tickFormatter={tickFormatter}
      domain={domain}
      width={45}
    />
  );
}

export function SharedGrid() {
  return (
    <CartesianGrid
      stroke={gridColor}
      strokeDasharray="3 3"
      vertical={false}
    />
  );
}
