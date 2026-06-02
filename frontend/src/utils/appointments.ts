import {
  differenceInMinutes,
  format,
  isSameDay,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Appointment } from "../types";

export function formatAppointmentDateTime(
  slotStart: string,
  timezone: string
): string {
  const zoned = toZonedTime(new Date(slotStart), timezone);
  return format(zoned, "EEE, d MMM · h:mm a");
}

export function getDurationLabel(slotStart: string, slotEnd: string): string {
  const mins = differenceInMinutes(new Date(slotEnd), new Date(slotStart));
  if (mins >= 60 && mins % 60 === 0) {
    const hrs = mins / 60;
    return hrs === 1 ? "1 hr" : `${hrs} hr`;
  }
  return `${mins} min`;
}

export function getAppointmentStats(
  appointments: Appointment[],
  timezone: string
): {
  totalActive: number;
  today: number;
  thisWeek: number;
  cancelled: number;
} {
  const now = toZonedTime(new Date(), timezone);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  let totalActive = 0;
  let today = 0;
  let thisWeek = 0;
  let cancelled = 0;

  for (const a of appointments) {
    if (a.status === "CANCELLED") {
      cancelled += 1;
      continue;
    }
    if (a.status !== "ACTIVE") continue;

    totalActive += 1;
    const slotZoned = toZonedTime(new Date(a.slot_start), timezone);
    if (isSameDay(slotZoned, now)) today += 1;
    if (isWithinInterval(slotZoned, { start: weekStart, end: weekEnd })) {
      thisWeek += 1;
    }
  }

  return { totalActive, today, thisWeek, cancelled };
}
