import { CalendarEvent, AvailabilityWindow } from "@/types";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

/**
 * Refresh Google access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch calendar events for a date range
 */
export async function fetchCalendarEvents(
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const url = `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("ACCESS_TOKEN_EXPIRED");
      }
      throw new Error(`Calendar API error: ${response.status}`);
    }

    const data: GoogleCalendarResponse = await response.json();

    for (const event of data.items) {
      const startTime = event.start.dateTime || event.start.date;
      const endTime = event.end.dateTime || event.end.date;

      if (startTime && endTime) {
        events.push({
          id: event.id,
          summary: event.summary || "(No title)",
          start: new Date(startTime),
          end: new Date(endTime),
          allDay: !event.start.dateTime,
        });
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
}

/**
 * Calculate availability windows (free time) from busy events
 */
export function calculateAvailability(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  dayStartHour: number = 6,
  dayEndHour: number = 20,
  minWindowMinutes: number = 60
): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];

  // Generate all days in range
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(dayStartHour, 0, 0, 0);

    const dayEnd = new Date(currentDate);
    dayEnd.setHours(dayEndHour, 0, 0, 0);

    // Get events for this day
    const dayEvents = events
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return eventStart < dayEnd && eventEnd > dayStart;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Find free windows
    let windowStart = dayStart;

    for (const event of dayEvents) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Clamp event times to day boundaries
      const busyStart = eventStart < dayStart ? dayStart : eventStart;
      const busyEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

      // If there's a gap before this event, it's free time
      if (busyStart > windowStart) {
        const duration = (busyStart.getTime() - windowStart.getTime()) / (1000 * 60);
        if (duration >= minWindowMinutes) {
          windows.push({
            start: new Date(windowStart),
            end: new Date(busyStart),
            duration,
          });
        }
      }

      // Move window start to after this event
      if (busyEnd > windowStart) {
        windowStart = new Date(busyEnd);
      }
    }

    // Add window after last event (if any)
    if (windowStart < dayEnd) {
      const duration = (dayEnd.getTime() - windowStart.getTime()) / (1000 * 60);
      if (duration >= minWindowMinutes) {
        windows.push({
          start: new Date(windowStart),
          end: new Date(dayEnd),
          duration,
        });
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return windows;
}

/**
 * Check if a time falls within any availability window
 */
export function isTimeAvailable(
  time: Date,
  windows: AvailabilityWindow[]
): AvailabilityWindow | null {
  for (const window of windows) {
    if (time >= window.start && time <= window.end) {
      return window;
    }
  }
  return null;
}

/**
 * Format availability window for display
 */
export function formatAvailabilityWindow(window: AvailabilityWindow): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  const startStr = window.start.toLocaleTimeString("en-US", options);
  const endStr = window.end.toLocaleTimeString("en-US", options);

  return `${startStr} - ${endStr} (${Math.floor(window.duration / 60)}h ${
    window.duration % 60
  }m)`;
}
