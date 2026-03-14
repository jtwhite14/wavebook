"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, formatDuration, getDateRange, areSameDay } from "@/lib/utils/date";
import { AvailabilityWindow, CalendarEvent } from "@/types";

interface AvailabilityViewProps {
  events: CalendarEvent[];
  availability: AvailabilityWindow[];
  startDate: Date;
  endDate: Date;
}

export function AvailabilityView({
  events,
  availability,
  startDate,
  endDate,
}: AvailabilityViewProps) {
  const days = getDateRange(startDate, endDate);

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayEvents = events.filter((e) => areSameDay(e.start, day));
        const dayAvailability = availability.filter((a) => areSameDay(a.start, day));

        return (
          <Card key={day.toISOString()}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{formatDate(day)}</CardTitle>
              <CardDescription>
                {dayAvailability.length > 0
                  ? `${dayAvailability.length} free window${dayAvailability.length > 1 ? "s" : ""}`
                  : "No availability"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Timeline visualization */}
                <div className="relative h-8 bg-muted rounded">
                  {/* Busy times (events) */}
                  {dayEvents.map((event, i) => {
                    const dayStart = new Date(day);
                    dayStart.setHours(6, 0, 0, 0);
                    const dayEnd = new Date(day);
                    dayEnd.setHours(20, 0, 0, 0);
                    const totalMinutes = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60);

                    const eventStart = Math.max(event.start.getTime(), dayStart.getTime());
                    const eventEnd = Math.min(event.end.getTime(), dayEnd.getTime());

                    const startOffset =
                      ((eventStart - dayStart.getTime()) / (1000 * 60) / totalMinutes) * 100;
                    const width =
                      ((eventEnd - eventStart) / (1000 * 60) / totalMinutes) * 100;

                    return (
                      <div
                        key={event.id || i}
                        className="absolute top-0 h-full bg-red-200 dark:bg-red-900/50 rounded"
                        style={{
                          left: `${Math.max(0, startOffset)}%`,
                          width: `${Math.min(100 - startOffset, width)}%`,
                        }}
                        title={event.summary}
                      />
                    );
                  })}

                  {/* Free times (availability) */}
                  {dayAvailability.map((window, i) => {
                    const dayStart = new Date(day);
                    dayStart.setHours(6, 0, 0, 0);
                    const dayEnd = new Date(day);
                    dayEnd.setHours(20, 0, 0, 0);
                    const totalMinutes = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60);

                    const startOffset =
                      ((window.start.getTime() - dayStart.getTime()) / (1000 * 60) / totalMinutes) *
                      100;
                    const width = (window.duration / totalMinutes) * 100;

                    return (
                      <div
                        key={i}
                        className="absolute top-0 h-full bg-green-300 dark:bg-green-700/50 rounded"
                        style={{
                          left: `${Math.max(0, startOffset)}%`,
                          width: `${Math.min(100 - startOffset, width)}%`,
                        }}
                      />
                    );
                  })}

                  {/* Time markers */}
                  <div className="absolute top-full mt-1 left-0 text-xs text-muted-foreground">
                    6am
                  </div>
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                    1pm
                  </div>
                  <div className="absolute top-full mt-1 right-0 text-xs text-muted-foreground">
                    8pm
                  </div>
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-xs text-muted-foreground pt-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-300 dark:bg-green-700/50 rounded" />
                    <span>Free</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-200 dark:bg-red-900/50 rounded" />
                    <span>Busy</span>
                  </div>
                </div>

                {/* Availability details */}
                {dayAvailability.length > 0 && (
                  <div className="pt-2 space-y-1">
                    {dayAvailability.map((window, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {formatTime(window.start)} - {formatTime(window.end)}
                        </span>
                        <Badge variant="outline" className="text-green-600">
                          {formatDuration(window.duration)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Events list */}
                {dayEvents.length > 0 && (
                  <div className="pt-2 space-y-1">
                    {dayEvents.map((event, i) => (
                      <div key={event.id || i} className="text-sm text-muted-foreground">
                        {formatTime(event.start)} - {event.summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
