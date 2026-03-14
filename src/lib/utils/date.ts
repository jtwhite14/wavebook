import {
  format,
  formatDistance,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  isSameDay,
  parseISO,
} from "date-fns";

/**
 * Format a date for display in the UI
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";

  return format(d, "EEE, MMM d");
}

/**
 * Format a date with full details
 */
export function formatFullDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "EEEE, MMMM d, yyyy");
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "h:mm a");
}

/**
 * Format date and time together
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${formatDate(d)} at ${formatTime(d)}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true });
}

/**
 * Get date range for the current week
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

/**
 * Get date range for a specific number of days ahead
 */
export function getForecastRange(days: number = 7): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfDay(now),
    end: endOfDay(addDays(now, days)),
  };
}

/**
 * Get date range for next N weeks
 */
export function getWeeksAheadRange(weeks: number = 2): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  return {
    start: startOfDay(now),
    end: endOfWeek(addWeeks(now, weeks - 1), { weekStartsOn: 1 }),
  };
}

/**
 * Generate array of dates for a range
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(start);
  const endDate = endOfDay(end);

  while (current <= endDate) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
}

/**
 * Group items by date
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date | string
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const date = getDate(item);
    const d = typeof date === "string" ? new Date(date) : date;
    const key = format(d, "yyyy-MM-dd");

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return groups;
}

/**
 * Parse ISO date string safely
 */
export function safeParseISO(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  try {
    return parseISO(dateString);
  } catch {
    return null;
  }
}

/**
 * Check if two dates are the same day
 */
export function areSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;
  return isSameDay(d1, d2);
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Get hour of day formatted for forecast display
 */
export function formatHourOfDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "ha").toLowerCase();
}

/**
 * Format date for API requests (ISO date only)
 */
export function toAPIDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Format datetime for API requests (ISO datetime)
 */
export function toAPIDateTime(date: Date): string {
  return date.toISOString();
}
