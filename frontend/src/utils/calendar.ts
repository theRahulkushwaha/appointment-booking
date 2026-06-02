import {
  addMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isBefore,
  parse,
  set,
  startOfWeek,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Appointment, SMBConfig, Slot } from "../types";

export function parseTimeString(timeStr: string): { hours: number; minutes: number; seconds: number } {
  const parts = timeStr.split(":").map(Number);
  return {
    hours: parts[0] ?? 0,
    minutes: parts[1] ?? 0,
    seconds: parts[2] ?? 0,
  };
}

export function getWeekUtcBounds(weekAnchor: Date, timezone: string): { weekStart: Date; weekEnd: Date } {
  const zonedAnchor = toZonedTime(weekAnchor, timezone);
  const monday = startOfWeek(zonedAnchor, { weekStartsOn: 1 });
  const sunday = endOfWeek(zonedAnchor, { weekStartsOn: 1 });
  const mondayStr = format(monday, "yyyy-MM-dd");
  const sundayStr = format(sunday, "yyyy-MM-dd");
  return {
    weekStart: new Date(`${mondayStr}T00:00:00.000Z`),
    weekEnd: new Date(`${sundayStr}T23:59:59.000Z`),
  };
}

export function getWeekDays(weekAnchor: Date, timezone: string): Date[] {
  const zonedAnchor = toZonedTime(weekAnchor, timezone);
  const monday = startOfWeek(zonedAnchor, { weekStartsOn: 1 });
  const sunday = endOfWeek(zonedAnchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: monday, end: sunday });
}

export function generateTimeLabels(config: SMBConfig): string[] {
  const start = parseTimeString(config.start_time);
  const end = parseTimeString(config.end_time);
  const labels: string[] = [];

  let cursor = set(new Date(2000, 0, 1), {
    hours: start.hours,
    minutes: start.minutes,
    seconds: 0,
  });
  const endCursor = set(new Date(2000, 0, 1), {
    hours: end.hours,
    minutes: end.minutes,
    seconds: 0,
  });

  while (isBefore(cursor, endCursor)) {
    labels.push(format(cursor, "HH:mm"));
    cursor = addMinutes(cursor, config.duration);
  }
  return labels;
}

export function buildLocalSlotUtc(
  day: Date,
  timeLabel: string,
  durationMinutes: number,
  timezone: string
): { slotStart: string; slotEnd: string; slotStartDate: Date; slotEndDate: Date } {
  const dayStr = format(day, "yyyy-MM-dd");
  const localStart = parse(`${dayStr} ${timeLabel}`, "yyyy-MM-dd HH:mm", new Date());
  const localEnd = addMinutes(localStart, durationMinutes);
  const slotStartDate = fromZonedTime(localStart, timezone);
  const slotEndDate = fromZonedTime(localEnd, timezone);
  return {
    slotStart: slotStartDate.toISOString(),
    slotEnd: slotEndDate.toISOString(),
    slotStartDate,
    slotEndDate,
  };
}

export function getActiveDays(daysCsv: string): Set<number> {
  return new Set(
    daysCsv
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .map(Number)
  );
}

export function getExcludedMap(
  excluded: SMBConfig["excluded_days"]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of excluded.days) {
    map.set(entry.day, entry.message);
  }
  return map;
}

export function slotKey(slotStart: string): string {
  return new Date(slotStart).toISOString();
}

export function slotsToSet(slots: Slot[]): Set<string> {
  return new Set(slots.map((s) => slotKey(s.slot_start)));
}

export function appointmentOverlaps(
  slotStart: Date,
  slotEnd: Date,
  appointments: Appointment[]
): Appointment | undefined {
  return appointments.find((a) => {
    const aStart = new Date(a.slot_start);
    const aEnd = new Date(a.slot_end);
    return slotStart < aEnd && slotEnd > aStart;
  });
}
