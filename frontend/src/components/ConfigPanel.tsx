import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../api/client";
import type { SMBConfig, SMBConfigUpdatePayload } from "../types";

const TIMEZONES = [
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

const DURATION_PRESETS: number[] = [15, 30, 60, 120];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ConfigPanelProps {
  config: SMBConfig;
  onSave: (payload: SMBConfigUpdatePayload) => Promise<SMBConfig>;
  onSaved: () => void;
}

function timeToInput(timeStr: string): string {
  const parts = timeStr.split(":");
  return `${parts[0] ?? "09"}:${parts[1] ?? "00"}`;
}

function inputToTime(value: string): string {
  const [h, m] = value.split(":");
  return `${h?.padStart(2, "0") ?? "09"}:${m?.padStart(2, "0") ?? "00"}:00`;
}

export function ConfigPanel({ config, onSave, onSaved }: ConfigPanelProps) {
  const [timezone, setTimezone] = useState(config.timezone);
  const [duration, setDuration] = useState(config.duration);
  const [customDuration, setCustomDuration] = useState(
    DURATION_PRESETS.includes(config.duration) ? "" : String(config.duration)
  );
  const [startTime, setStartTime] = useState(timeToInput(config.start_time));
  const [endTime, setEndTime] = useState(timeToInput(config.end_time));
  const [activeDays, setActiveDays] = useState<Set<number>>(() => {
    return new Set(
      config.days
        .split(",")
        .map((d) => Number(d.trim()))
        .filter((n) => !Number.isNaN(n))
    );
  });
  const [excludedDays, setExcludedDays] = useState(config.excluded_days.days);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTimezone(config.timezone);
    setDuration(config.duration);
    setCustomDuration(
      DURATION_PRESETS.includes(config.duration) ? "" : String(config.duration)
    );
    setStartTime(timeToInput(config.start_time));
    setEndTime(timeToInput(config.end_time));
    setActiveDays(
      new Set(
        config.days
          .split(",")
          .map((d) => Number(d.trim()))
          .filter((n) => !Number.isNaN(n))
      )
    );
    setExcludedDays(config.excluded_days.days);
  }, [config]);

  const selectPreset = (d: number) => {
    setDuration(d);
    setCustomDuration("");
  };

  const handleCustomDuration = (value: string) => {
    setCustomDuration(value);
    const n = parseInt(value, 10);
    if (!Number.isNaN(n) && n > 0 && n < 480) {
      setDuration(n);
    }
  };

  const toggleDay = (day: number) => {
    setActiveDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const addHoliday = () => {
    setExcludedDays((prev) => [
      ...prev,
      { day: new Date().toISOString().slice(0, 10), message: "Holiday" },
    ]);
  };

  const removeHoliday = (index: number) => {
    setExcludedDays((prev) => prev.filter((_, i) => i !== index));
  };

  const updateHoliday = (
    index: number,
    field: "day" | "message",
    value: string
  ) => {
    setExcludedDays((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  };

  const handleSave = async () => {
    const finalDuration = customDuration.trim()
      ? parseInt(customDuration, 10)
      : duration;

    if (Number.isNaN(finalDuration) || finalDuration <= 0 || finalDuration >= 480) {
      toast.error("Duration must be between 1 and 479 minutes");
      return;
    }

    const daysCsv = [1, 2, 3, 4, 5, 6, 7]
      .filter((d) => activeDays.has(d))
      .join(",");

    if (!daysCsv) {
      toast.error("Select at least one working day");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        timezone,
        duration: finalDuration,
        start_time: inputToTime(startTime),
        end_time: inputToTime(endTime),
        days: daysCsv,
        excluded_days: { days: excludedDays },
      });
      toast.success("Settings saved successfully");
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isPresetActive = (d: number) =>
    duration === d && !customDuration.trim();

  return (
    <div className="card-surface space-y-6 p-4 md:p-6">
      <h2 className="font-heading text-xl font-bold text-primary">Business settings</h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-primary">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-primary">Slot duration</span>
          <div className="mb-3 flex flex-wrap gap-2">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => selectPreset(d)}
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isPresetActive(d)
                    ? "nav-tab-active border-accent"
                    : "border-border text-secondary hover:bg-hover"
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
          <label className="mb-1 block text-xs text-secondary">Custom (minutes)</label>
          <input
            type="number"
            min={1}
            max={479}
            value={customDuration}
            onChange={(e) => handleCustomDuration(e.target.value)}
            placeholder="e.g. 45"
            className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
          />
          <p className="mt-1 text-xs text-secondary">
            Current: <strong className="text-accent">{duration} min</strong>
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-primary">Opens at</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-primary">Closes at</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-primary">Working days</span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, i) => {
            const dayNum = i + 1;
            const active = activeDays.has(dayNum);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(dayNum)}
                className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "nav-tab-active border-accent"
                    : "border-border text-secondary hover:bg-hover"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-primary">Holidays & excluded dates</span>
          <button
            type="button"
            onClick={addHoliday}
            className="flex min-h-[44px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-secondary transition-all duration-200 hover:border-accent hover:text-primary"
          >
            <Plus size={14} />
            Add date
          </button>
        </div>
        <div className="space-y-2">
          {excludedDays.length === 0 && (
            <p className="text-sm text-secondary">No excluded dates configured.</p>
          )}
          {excludedDays.map((entry, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                value={entry.day}
                onChange={(e) => updateHoliday(index, "day", e.target.value)}
                className="input-field min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={entry.message}
                onChange={(e) => updateHoliday(index, "message", e.target.value)}
                placeholder="Label"
                className="input-field min-h-[44px] flex-[2] rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeHoliday(index)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-secondary transition-all duration-200 hover:border-danger hover:text-danger"
                aria-label="Remove holiday"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="btn-cta flex min-h-[44px] items-center gap-2 rounded-lg px-5 py-3 font-medium disabled:opacity-60"
      >
        <Save size={18} />
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
