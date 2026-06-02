import { addWeeks, format, isBefore, isSameDay, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Appointment, SMBConfig, Slot } from "../types";
import {
  appointmentOverlaps,
  buildLocalSlotUtc,
  generateTimeLabels,
  getActiveDays,
  getExcludedMap,
  getWeekDays,
  parseTimeString,
  slotsToSet,
} from "../utils/calendar";
import type { SlotCellStatus } from "./SlotCell";
import { SlotCell } from "./SlotCell";

interface CalendarGridProps {
  config: SMBConfig;
  slots: Slot[];
  appointments: Appointment[];
  weekAnchor: Date;
  onWeekChange: (anchor: Date) => void;
  onSlotSelect: (slot: Slot) => void;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function resolveCellStatus(
  config: SMBConfig,
  day: Date,
  timeLabel: string,
  availableSlots: Set<string>,
  appointments: Appointment[],
  nowZoned: Date
): { status: SlotCellStatus; slot?: Slot; holidayMessage?: string } {
  const activeDays = getActiveDays(config.days);
  const excluded = getExcludedMap(config.excluded_days);
  const dayStr = format(day, "yyyy-MM-dd");
  const weekday = day.getDay() === 0 ? 7 : day.getDay();

  if (excluded.has(dayStr)) {
    return { status: "holiday", holidayMessage: excluded.get(dayStr) };
  }

  if (!activeDays.has(weekday)) {
    return { status: "closed" };
  }

  const { slotStart, slotEnd, slotStartDate, slotEndDate } = buildLocalSlotUtc(
    day,
    timeLabel,
    config.duration,
    config.timezone
  );

  const startParts = parseTimeString(config.start_time);
  const endParts = parseTimeString(config.end_time);
  const [h, m] = timeLabel.split(":").map(Number);
  const slotStartMinutes = (h ?? 0) * 60 + (m ?? 0);
  const startMinutes = startParts.hours * 60 + startParts.minutes;
  const endMinutes = endParts.hours * 60 + endParts.minutes;
  const slotEndMinutes = slotStartMinutes + config.duration;

  if (slotStartMinutes < startMinutes || slotEndMinutes > endMinutes) {
    return { status: "non-working" };
  }

  const slotStartZoned = toZonedTime(slotStartDate, config.timezone);
  if (isBefore(slotStartZoned, nowZoned)) {
    return { status: "past" };
  }

  const booked = appointmentOverlaps(slotStartDate, slotEndDate, appointments);
  if (booked) {
    return { status: "booked" };
  }

  if (availableSlots.has(new Date(slotStart).toISOString())) {
    return {
      status: "available",
      slot: { slot_start: slotStart, slot_end: slotEnd },
    };
  }

  return { status: "non-working" };
}

function DayColumn({
  day,
  config,
  timeLabels,
  availableSlots,
  appointments,
  nowZoned,
  onSlotSelect,
  activeDays,
  excluded,
}: {
  day: Date;
  config: SMBConfig;
  timeLabels: string[];
  availableSlots: Set<string>;
  appointments: Appointment[];
  nowZoned: Date;
  onSlotSelect: (slot: Slot) => void;
  activeDays: Set<number>;
  excluded: Map<string, string>;
}) {
  const dayStr = format(day, "yyyy-MM-dd");
  const weekday = day.getDay() === 0 ? 7 : day.getDay();
  const isClosedDay = !activeDays.has(weekday);
  const holidayMsg = excluded.get(dayStr);

  return (
    <>
      {timeLabels.map((timeLabel) => {
        if (isClosedDay) {
          return (
            <SlotCell key={`${dayStr}-${timeLabel}`} status="closed" timeLabel="" />
          );
        }
        if (holidayMsg) {
          return (
            <SlotCell
              key={`${dayStr}-${timeLabel}`}
              status="holiday"
              timeLabel={timeLabel}
              holidayMessage={holidayMsg}
            />
          );
        }
        const { status, slot, holidayMessage } = resolveCellStatus(
          config,
          day,
          timeLabel,
          availableSlots,
          appointments,
          nowZoned
        );
        return (
          <SlotCell
            key={`${dayStr}-${timeLabel}`}
            status={status}
            timeLabel={timeLabel}
            holidayMessage={holidayMessage}
            onClick={
              status === "available" && slot ? () => onSlotSelect(slot) : undefined
            }
          />
        );
      })}
    </>
  );
}

export function CalendarGrid({
  config,
  slots,
  appointments,
  weekAnchor,
  onWeekChange,
  onSlotSelect,
}: CalendarGridProps) {
  const weekDays = useMemo(
    () => getWeekDays(weekAnchor, config.timezone),
    [weekAnchor, config.timezone]
  );

  const todayZoned = useMemo(
    () => toZonedTime(new Date(), config.timezone),
    [config.timezone]
  );

  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  useEffect(() => {
    const todayIdx = weekDays.findIndex((d) => isSameDay(d, todayZoned));
    setMobileDayIndex(todayIdx >= 0 ? todayIdx : 0);
  }, [weekDays, todayZoned]);

  const nowZoned = todayZoned;
  const timeLabels = useMemo(() => generateTimeLabels(config), [config]);
  const availableSlots = useMemo(() => slotsToSet(slots), [slots]);
  const activeDays = getActiveDays(config.days);
  const excluded = getExcludedMap(config.excluded_days);

  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (!start || !end) return "";
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }, [weekDays]);

  const mobileDay = weekDays[mobileDayIndex] ?? weekDays[0];

  const goToday = () => {
    onWeekChange(todayZoned);
  };

  const goPrevWeek = () => onWeekChange(subWeeks(weekAnchor, 1));
  const goNextWeek = () => onWeekChange(addWeeks(weekAnchor, 1));

  const navControls = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={goPrevWeek}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-secondary transition-all duration-200 hover:border-accent hover:bg-hover hover:text-primary"
        aria-label="Previous week"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={goToday}
        className="min-h-[44px] rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:border-accent hover:bg-hover"
      >
        Today
      </button>
      <button
        type="button"
        onClick={goNextWeek}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-secondary transition-all duration-200 hover:border-accent hover:bg-hover hover:text-primary"
        aria-label="Next week"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );

  return (
    <div className="card-surface p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-lg font-bold text-primary">{weekRangeLabel}</p>
          <p className="text-sm text-secondary">
            Business timezone:{" "}
            <span className="font-semibold text-accent">{config.timezone}</span>
          </p>
        </div>
        {navControls}
      </div>

      {/* Mobile: date strip + single day */}
      <div className="md:hidden">
        <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
          {weekDays.map((day, i) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const weekday = day.getDay() === 0 ? 7 : day.getDay();
            const isClosed = !activeDays.has(weekday);
            const isSelected = i === mobileDayIndex;
            return (
              <button
                key={dayStr}
                type="button"
                onClick={() => setMobileDayIndex(i)}
                className={`min-h-[44px] shrink-0 rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? "nav-tab-active border-accent"
                    : "border-border bg-card text-secondary hover:bg-hover"
                }`}
              >
                <div>{DAY_NAMES[i]}</div>
                <div className="opacity-80">{format(day, "d")}</div>
                {isClosed && <div className="text-[9px] opacity-60">Off</div>}
              </button>
            );
          })}
        </div>

        {mobileDay && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobileDayIndex((i) => Math.max(0, i - 1))}
                disabled={mobileDayIndex === 0}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border disabled:opacity-40"
                aria-label="Previous day"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm font-semibold text-primary">
                {format(mobileDay, "EEEE, MMM d")}
              </p>
              <button
                type="button"
                onClick={() =>
                  setMobileDayIndex((i) => Math.min(weekDays.length - 1, i + 1))
                }
                disabled={mobileDayIndex >= weekDays.length - 1}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border disabled:opacity-40"
                aria-label="Next day"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: "4rem 1fr" }}
            >
              {timeLabels.map((timeLabel) => (
                <div key={timeLabel} className="contents">
                  <div className="flex items-center justify-end pr-2 text-xs text-secondary">
                    {timeLabel}
                  </div>
                  <DayColumn
                    day={mobileDay}
                    config={config}
                    timeLabels={[timeLabel]}
                    availableSlots={availableSlots}
                    appointments={appointments}
                    nowZoned={nowZoned}
                    onSlotSelect={onSlotSelect}
                    activeDays={activeDays}
                    excluded={excluded}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop: 7-column week */}
      <div className="hidden overflow-x-auto md:block">
        <div
          className="grid min-w-[640px] gap-1"
          style={{ gridTemplateColumns: `4rem repeat(7, minmax(0, 1fr))` }}
        >
          <div />
          {weekDays.map((day, i) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const weekday = day.getDay() === 0 ? 7 : day.getDay();
            const isClosed = !activeDays.has(weekday);
            const isHoliday = excluded.has(dayStr);
            return (
              <div
                key={dayStr}
                className={`rounded-lg px-1 py-2 text-center text-xs font-semibold ${
                  isClosed || isHoliday
                    ? "bg-hover text-secondary"
                    : "text-primary"
                }`}
              >
                <div>{DAY_NAMES[i]}</div>
                <div className="text-[10px] font-normal opacity-70">
                  {format(day, "MMM d")}
                </div>
                {isClosed && !isHoliday && (
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-secondary">
                    Closed
                  </div>
                )}
              </div>
            );
          })}
          {timeLabels.map((timeLabel) => (
            <div key={timeLabel} className="contents">
              <div className="flex items-center justify-end pr-2 text-xs text-secondary">
                {timeLabel}
              </div>
              {weekDays.map((day) => (
                <div key={`${format(day, "yyyy-MM-dd")}-${timeLabel}`} className="contents">
                  <DayColumn
                    day={day}
                    config={config}
                    timeLabels={[timeLabel]}
                    availableSlots={availableSlots}
                    appointments={appointments}
                    nowZoned={nowZoned}
                    onSlotSelect={onSlotSelect}
                    activeDays={activeDays}
                    excluded={excluded}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
