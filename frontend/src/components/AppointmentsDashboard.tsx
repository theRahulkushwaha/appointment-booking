import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Loader2,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { cancelAppointment, getErrorMessage } from "../api/client";
import type { Appointment, AppointmentStatusFilter, SMBConfig } from "../types";
import {
  formatAppointmentDateTime,
  getAppointmentStats,
  getDurationLabel,
} from "../utils/appointments";

interface AppointmentsDashboardProps {
  config: SMBConfig;
  appointments: Appointment[];
  loading: boolean;
  onRefresh: () => void;
}

export function AppointmentsDashboard({
  config,
  appointments,
  loading,
  onRefresh,
}: AppointmentsDashboardProps) {
  const [filter, setFilter] = useState<AppointmentStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const stats = useMemo(
    () => getAppointmentStats(appointments, config.timezone),
    [appointments, config.timezone]
  );

  const filtered = useMemo(() => {
    let list = appointments;
    if (filter === "ACTIVE") list = list.filter((a) => a.status === "ACTIVE");
    if (filter === "CANCELLED") list = list.filter((a) => a.status === "CANCELLED");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.lead_name.toLowerCase().includes(q));
    }
    return list;
  }, [appointments, filter, search]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelAppointment(id);
      toast.success("Appointment cancelled");
      setConfirmCancelId(null);
      onRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  const statCards = [
    { label: "Active", value: stats.totalActive, icon: CalendarCheck, color: "text-success" },
    { label: "Today", value: stats.today, icon: CalendarClock, color: "text-accent" },
    { label: "This week", value: stats.thisWeek, icon: CalendarDays, color: "text-accent" },
    { label: "Cancelled", value: stats.cancelled, icon: CalendarX, color: "text-danger" },
  ];

  const filters: AppointmentStatusFilter[] = ["ALL", "ACTIVE", "CANCELLED"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card-surface flex items-center gap-3 p-4 transition-all duration-200">
            <div className={`rounded-lg bg-hover p-2 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{value}</p>
              <p className="text-xs text-secondary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-surface space-y-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-xl font-bold text-primary">Appointments</h2>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="input-field min-h-[44px] w-full rounded-lg py-2 pl-9 pr-3 text-sm sm:w-64"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`min-h-[44px] rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                filter === f
                  ? "nav-tab-active border-accent"
                  : "border-border text-secondary hover:bg-hover"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays size={48} className="mb-4 text-secondary opacity-50" />
            <p className="font-heading text-lg font-semibold text-primary">No appointments yet</p>
            <p className="mt-2 max-w-sm text-sm text-secondary">
              Book a slot from the Calendar tab to see appointments here.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-secondary">
                    <th className="pb-3 pr-4 font-medium">Customer</th>
                    <th className="pb-3 pr-4 font-medium">Date & time</th>
                    <th className="pb-3 pr-4 font-medium">Duration</th>
                    <th className="pb-3 pr-4 font-medium">Purpose</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <AppointmentRow
                      key={a.id}
                      appointment={a}
                      config={config}
                      confirmCancelId={confirmCancelId}
                      cancellingId={cancellingId}
                      onConfirmCancel={setConfirmCancelId}
                      onCancel={handleCancel}
                      variant="table"
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {filtered.map((a) => (
                <AppointmentRow
                  key={a.id}
                  appointment={a}
                  config={config}
                  confirmCancelId={confirmCancelId}
                  cancellingId={cancellingId}
                  onConfirmCancel={setConfirmCancelId}
                  onCancel={handleCancel}
                  variant="card"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AppointmentRow({
  appointment: a,
  config,
  confirmCancelId,
  cancellingId,
  onConfirmCancel,
  onCancel,
  variant,
}: {
  appointment: Appointment;
  config: SMBConfig;
  confirmCancelId: string | null;
  cancellingId: string | null;
  onConfirmCancel: (id: string | null) => void;
  onCancel: (id: string) => void;
  variant: "table" | "card";
}) {
  const isActive = a.status === "ACTIVE";
  const dateTime = formatAppointmentDateTime(a.slot_start, config.timezone);
  const duration = getDurationLabel(a.slot_start, a.slot_end);
  const purpose = a.purpose ?? "—";

  const statusBadge = (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isActive
          ? "bg-success/20 text-success"
          : "bg-hover text-secondary"
      }`}
    >
      {isActive ? "Active" : "Cancelled"}
    </span>
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {isActive && confirmCancelId !== a.id && (
        <button
          type="button"
          onClick={() => onConfirmCancel(a.id)}
          className="min-h-[44px] rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger transition-all duration-200 hover:bg-danger/10"
        >
          Cancel
        </button>
      )}
      {isActive && confirmCancelId === a.id && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-secondary">Are you sure?</span>
          <button
            type="button"
            onClick={() => void onCancel(a.id)}
            disabled={cancellingId === a.id}
            className="min-h-[44px] rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white transition-all duration-200 disabled:opacity-60"
          >
            {cancellingId === a.id ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Yes, cancel"
            )}
          </button>
          <button
            type="button"
            onClick={() => onConfirmCancel(null)}
            className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-secondary"
          >
            No
          </button>
        </div>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 transition-all duration-200">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-semibold text-primary">{a.lead_name}</p>
          {statusBadge}
        </div>
        <p className="text-sm text-secondary">{dateTime}</p>
        <p className="mt-1 text-sm text-secondary">{duration}</p>
        <p className="mt-1 text-sm">
          <span className="text-secondary">Purpose: </span>
          {purpose}
        </p>
        {a.email && (
          <p className="mt-1 text-sm text-secondary">{a.email}</p>
        )}
        <div className="mt-3">{actions}</div>
      </div>
    );
  }

  return (
    <tr className="border-b border-border transition-colors duration-200 hover:bg-hover/50">
      <td className="py-3 pr-4 font-medium text-primary">{a.lead_name}</td>
      <td className="py-3 pr-4 text-secondary">{dateTime}</td>
      <td className="py-3 pr-4 text-secondary">{duration}</td>
      <td className="py-3 pr-4 text-secondary">{purpose}</td>
      <td className="py-3 pr-4">{statusBadge}</td>
      <td className="py-3">{actions}</td>
    </tr>
  );
}
