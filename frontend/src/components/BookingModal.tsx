import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Calendar, Clock, Loader2, Timer, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { createAppointment, getErrorMessage } from "../api/client";
import { PURPOSE_OPTIONS, type PurposeOption } from "../types";
import type { SMBConfig, Slot } from "../types";
import { getDurationLabel } from "../utils/appointments";

interface BookingModalProps {
  slot: Slot | null;
  config: SMBConfig;
  onClose: () => void;
  onSuccess: () => void;
}

function getTimezoneAbbr(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? timezone;
  } catch {
    return timezone;
  }
}

export function BookingModal({ slot, config, onClose, onSuccess }: BookingModalProps) {
  const [leadName, setLeadName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState<PurposeOption>("Consultation");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!slot) return null;

  const slotStartZoned = toZonedTime(new Date(slot.slot_start), config.timezone);
  const slotEndZoned = toZonedTime(new Date(slot.slot_end), config.timezone);
  const tzAbbr = getTimezoneAbbr(config.timezone);
  const durationLabel = getDurationLabel(slot.slot_start, slot.slot_end);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!leadName.trim()) next.leadName = "Full name is required";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (comment.length > 300) next.comment = "Comment must be 300 characters or less";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await createAppointment({
        smb_id: config.smb_id,
        lead_name: leadName.trim(),
        slot_start: slot.slot_start,
        slot_end: slot.slot_end,
        purpose,
        comment: comment.trim() || null,
        email: email.trim() || null,
      });
      setConfirmed(true);
      toast.success("Appointment booked successfully!");
      onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error("Slot no longer available, please choose another");
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const slotInfo = (
    <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
      <div className="flex items-start gap-2 text-sm text-primary">
        <Calendar size={16} className="mt-0.5 shrink-0 text-accent" />
        <span>{format(slotStartZoned, "EEEE, d MMM yyyy")}</span>
      </div>
      <div className="mt-2 flex items-start gap-2 text-sm text-primary">
        <Clock size={16} className="mt-0.5 shrink-0 text-accent" />
        <span>
          {format(slotStartZoned, "h:mm a")} – {format(slotEndZoned, "h:mm a")} ({tzAbbr})
        </span>
      </div>
      <div className="mt-2 flex items-start gap-2 text-sm text-secondary">
        <Timer size={16} className="mt-0.5 shrink-0" />
        <span>{durationLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-4">
      <div className="card-surface flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl p-6 md:max-w-lg md:rounded-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-heading text-xl font-bold text-primary">
            {confirmed ? "Confirmed!" : "Book appointment"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-secondary transition-all duration-200 hover:bg-hover hover:text-primary"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {confirmed ? (
          <div className="space-y-4">
            {slotInfo}
            <p className="text-success">
              Your appointment for <strong>{leadName}</strong> has been confirmed.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-cta min-h-[44px] w-full rounded-lg px-4 py-3 font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {slotInfo}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="lead_name" className="mb-1 block text-sm font-medium text-primary">
                  Full name <span className="text-danger">*</span>
                </label>
                <input
                  id="lead_name"
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
                  placeholder="John Doe"
                />
                {errors.leadName && (
                  <p className="mt-1 text-xs text-danger">{errors.leadName}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-primary">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-danger">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="purpose" className="mb-1 block text-sm font-medium text-primary">
                Purpose
              </label>
              <select
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as PurposeOption)}
                className="input-field min-h-[44px] w-full rounded-lg px-3 py-2"
              >
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="comment" className="mb-1 block text-sm font-medium text-primary">
                Comment
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 300))}
                rows={3}
                className="input-field w-full rounded-lg px-3 py-2"
                placeholder="Any additional notes..."
              />
              <p className="mt-1 text-right text-xs text-secondary">{comment.length}/300</p>
              {errors.comment && (
                <p className="text-xs text-danger">{errors.comment}</p>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium text-secondary transition-all duration-200 hover:bg-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !leadName.trim()}
                className="btn-cta flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Confirm booking
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
