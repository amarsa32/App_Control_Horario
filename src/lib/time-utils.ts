import { TimeEntry, DaySummary, UserState, EntryType } from "./types";
import {
  differenceInMinutes,
  differenceInSeconds,
  parseISO,
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";

/**
 * Derive the current user state from today's time entries.
 */
export function deriveUserState(entries: TimeEntry[]): UserState {
  if (entries.length === 0) return "idle";
  const last = entries[entries.length - 1];
  switch (last.entry_type) {
    case "clock_in":
    case "break_end":
      return "working";
    case "break_start":
      return "on_break";
    case "clock_out":
      return "idle";
    default:
      return "idle";
  }
}

/**
 * Get the valid next actions for a given state.
 */
export function getValidActions(state: UserState): EntryType[] {
  switch (state) {
    case "idle":
      return ["clock_in"];
    case "working":
      return ["break_start", "clock_out"];
    case "on_break":
      return ["break_end"];
    default:
      return [];
  }
}

/**
 * Calculate elapsed seconds since the last relevant entry.
 */
export function getElapsedSeconds(entries: TimeEntry[]): number {
  if (entries.length === 0) return 0;
  const last = entries[entries.length - 1];
  return differenceInSeconds(new Date(), parseISO(last.created_at));
}

/**
 * Calculate total working seconds for today (for live display).
 */
export function getTotalWorkingSeconds(entries: TimeEntry[]): number {
  let total = 0;
  let lastClockIn: Date | null = null;
  let lastBreakStart: Date | null = null;
  let breakAccum = 0;

  for (const entry of entries) {
    const t = parseISO(entry.created_at);
    switch (entry.entry_type) {
      case "clock_in":
        lastClockIn = t;
        breakAccum = 0;
        break;
      case "break_start":
        if (lastClockIn) {
          total += differenceInSeconds(t, lastClockIn) - breakAccum;
        }
        lastBreakStart = t;
        break;
      case "break_end":
        if (lastBreakStart) {
          breakAccum += differenceInSeconds(t, lastBreakStart);
        }
        lastBreakStart = null;
        lastClockIn = t;
        // Reset break accum since we restart counting from break_end
        breakAccum = 0;
        break;
      case "clock_out":
        if (lastClockIn) {
          total += differenceInSeconds(t, lastClockIn) - breakAccum;
        }
        lastClockIn = null;
        breakAccum = 0;
        break;
    }
  }

  // If still working, add time since last relevant entry
  if (lastClockIn && !lastBreakStart) {
    total += differenceInSeconds(new Date(), lastClockIn);
  }

  return Math.max(0, total);
}

/**
 * Calculate a day summary from entries.
 */
export function calculateDaySummary(
  date: string,
  entries: TimeEntry[]
): DaySummary {
  const clockIn = entries.find((e) => e.entry_type === "clock_in");
  const clockOut = entries.find((e) => e.entry_type === "clock_out");

  let grossMinutes = 0;
  let breakMinutes = 0;

  if (clockIn && clockOut) {
    grossMinutes = differenceInMinutes(
      parseISO(clockOut.created_at),
      parseISO(clockIn.created_at)
    );
  }

  // Calculate break time
  const breakStarts = entries.filter((e) => e.entry_type === "break_start");
  const breakEnds = entries.filter((e) => e.entry_type === "break_end");

  for (let i = 0; i < Math.min(breakStarts.length, breakEnds.length); i++) {
    breakMinutes += differenceInMinutes(
      parseISO(breakEnds[i].created_at),
      parseISO(breakStarts[i].created_at)
    );
  }

  const netMinutes = Math.max(0, grossMinutes - breakMinutes);

  return {
    date,
    clockIn: clockIn ? clockIn.created_at : null,
    clockOut: clockOut ? clockOut.created_at : null,
    grossMinutes,
    breakMinutes,
    netMinutes,
    entries,
  };
}

/**
 * Group entries by reference_date and compute summaries.
 */
export function groupEntriesByDate(entries: TimeEntry[]): DaySummary[] {
  const grouped: Record<string, TimeEntry[]> = {};

  for (const entry of entries) {
    const date = entry.reference_date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  }

  // Sort entries within each day by created_at
  for (const date in grouped) {
    grouped[date].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return Object.entries(grouped)
    .map(([date, entries]) => calculateDaySummary(date, entries))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Format seconds into HH:MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Format minutes into Xh Ym
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format a timestamp to local time string HH:mm
 */
export function formatTime(isoString: string): string {
  return format(parseISO(isoString), "HH:mm");
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "EEEE, d 'de' MMMM", { locale: es });
}

/**
 * Get weekly chart data for the last 7 days.
 */
export function getWeeklyChartData(
  summaries: DaySummary[]
): { day: string; hours: number; date: string }[] {
  const today = new Date();
  const days: { day: string; hours: number; date: string }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayLabel = format(d, "EEE", { locale: es });
    const summary = summaries.find((s) => s.date === dateStr);
    days.push({
      day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
      hours: summary ? Math.round((summary.netMinutes / 60) * 100) / 100 : 0,
      date: dateStr,
    });
  }

  return days;
}

/**
 * Calculate weekly totals.
 */
export function getWeeklyTotals(summaries: DaySummary[]): {
  totalNetMinutes: number;
  totalBreakMinutes: number;
  daysWorked: number;
} {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekDates = weekDays.map((d) => format(d, "yyyy-MM-dd"));

  const weeklySummaries = summaries.filter((s) =>
    weekDates.includes(s.date)
  );

  return {
    totalNetMinutes: weeklySummaries.reduce((a, s) => a + s.netMinutes, 0),
    totalBreakMinutes: weeklySummaries.reduce((a, s) => a + s.breakMinutes, 0),
    daysWorked: weeklySummaries.filter((s) => s.netMinutes > 0).length,
  };
}
