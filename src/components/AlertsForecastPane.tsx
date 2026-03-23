"use client";

import { useState } from "react";
import { Bell, CloudSun } from "lucide-react";
import { SpotAlertCard } from "@/components/alerts/SpotAlertCard";
import { WeeklyForecast } from "@/components/forecast/WeeklyForecast";

type Tab = "alerts" | "forecast";

interface AlertsForecastPaneProps {
  spotId: string;
  sessionCount: number;
}

export function AlertsForecastPane({ spotId, sessionCount }: AlertsForecastPaneProps) {
  const [tab, setTab] = useState<Tab>("alerts");

  return (
    <div className="rounded-lg border bg-background/60 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b">
        <button
          onClick={() => setTab("alerts")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            tab === "alerts"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="size-3.5" />
          Alerts
        </button>
        <button
          onClick={() => setTab("forecast")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            tab === "forecast"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CloudSun className="size-3.5" />
          Forecast
        </button>
      </div>

      {/* Tab content */}
      <div>
        {tab === "alerts" ? (
          <div className="p-3">
            <SpotAlertCard spotId={spotId} sessionCount={sessionCount} embedded />
          </div>
        ) : (
          <WeeklyForecast spotId={spotId} embedded />
        )}
      </div>
    </div>
  );
}
