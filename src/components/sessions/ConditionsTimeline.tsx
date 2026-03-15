"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HourlyForecast } from "@/types";
import { WaveChart } from "./charts/WaveChart";
import { SwellChart } from "./charts/SwellChart";
import { WindChart } from "./charts/WindChart";
import { TemperatureChart } from "./charts/TemperatureChart";
import { AtmospherePanel } from "./charts/AtmospherePanel";

interface ConditionsTimelineProps {
  sessionId: string;
}

export function ConditionsTimeline({ sessionId }: ConditionsTimelineProps) {
  const [timeline, setTimeline] = useState<HourlyForecast[]>([]);
  const [sessionHourIndex, setSessionHourIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/timeline`);
        if (!res.ok) {
          setError("Failed to load timeline");
          return;
        }
        const data = await res.json();
        setTimeline(data.timeline);
        setSessionHourIndex(data.sessionHourIndex);
      } catch {
        setError("Failed to load timeline");
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [sessionId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conditions Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[200px] bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || timeline.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conditions Timeline</CardTitle>
        <CardDescription>
          13-hour window around your session (highlighted)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <WaveChart data={timeline} sessionIndex={sessionHourIndex} />
        <SwellChart data={timeline} sessionIndex={sessionHourIndex} />
        <WindChart data={timeline} sessionIndex={sessionHourIndex} />
        <TemperatureChart data={timeline} sessionIndex={sessionHourIndex} />
        <AtmospherePanel data={timeline} sessionIndex={sessionHourIndex} />
      </CardContent>
    </Card>
  );
}
