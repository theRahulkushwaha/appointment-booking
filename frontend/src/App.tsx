import { toZonedTime } from "date-fns-tz";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getAppointments, getErrorMessage, setUnauthorizedHandler } from "./api/client";
import { AppointmentsDashboard } from "./components/AppointmentsDashboard";
import { BookingModal } from "./components/BookingModal";
import { CalendarGrid } from "./components/CalendarGrid";
import { ConfigPanel } from "./components/ConfigPanel";
import { Navbar, type AppTab } from "./components/Navbar";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { useConfig } from "./hooks/useConfig";
import { useSlots } from "./hooks/useSlots";
import { AuthPage } from "./pages/AuthPage";
import type { Appointment, Slot } from "./types";
import { DEFAULT_SMB_ID } from "./types";
import { getWeekUtcBounds } from "./utils/calendar";

export default function App() {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { theme } = useTheme();
  const smbId = DEFAULT_SMB_ID;
  const { config, loading: configLoading, updateConfig, refetch: refetchConfig } =
    useConfig(smbId);

  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const [activeTab, setActiveTab] = useState<AppTab>("calendar");
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast.error("Session expired. Please sign in again.");
    });
  }, [logout]);

  useEffect(() => {
    if (config) {
      setWeekAnchor(toZonedTime(new Date(), config.timezone));
    }
  }, [config?.timezone]);

  const { weekStart, weekEnd } = useMemo(() => {
    if (!config) {
      return { weekStart: new Date(), weekEnd: new Date() };
    }
    return getWeekUtcBounds(weekAnchor, config.timezone);
  }, [weekAnchor, config]);

  const { slots, loading: slotsLoading, refetch: refetchSlots } = useSlots(
    smbId,
    weekStart,
    weekEnd,
    config
  );

  const fetchCalendarAppointments = useCallback(async () => {
    try {
      const data = await getAppointments(smbId, "ACTIVE");
      setCalendarAppointments(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [smbId]);

  const fetchAllAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    try {
      const data = await getAppointments(smbId);
      setAllAppointments(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAppointmentsLoading(false);
    }
  }, [smbId]);

  useEffect(() => {
    if (isAuthenticated && config) {
      void fetchCalendarAppointments();
      void fetchAllAppointments();
    }
  }, [isAuthenticated, config, fetchCalendarAppointments, fetchAllAppointments]);

  const handleConfigSaved = () => {
    void refetchConfig();
    void refetchSlots();
    void fetchCalendarAppointments();
    void fetchAllAppointments();
  };

  const handleBookingSuccess = () => {
    void refetchSlots();
    void fetchCalendarAppointments();
    void fetchAllAppointments();
  };

  const toastStyle = useMemo(
    () => ({
      background: theme === "dark" ? "#1c1c27" : "#ffffff",
      color: theme === "dark" ? "#f0f0ff" : "#0a0a1a",
      border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
    }),
    [theme]
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ style: toastStyle }} />
        <AuthPage />
      </>
    );
  }

  if (configLoading || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  const isCalendarLoading = slotsLoading && activeTab === "calendar";

  return (
    <div className="min-h-screen bg-background font-sans text-primary">
      <Toaster position="top-right" toastOptions={{ style: toastStyle }} />

      <Navbar
        timezone={config.timezone}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="mx-auto max-w-6xl px-4 py-4 md:py-6">
        {/* Mobile tab bar */}
        <div className="mb-4 flex gap-2 rounded-xl border border-border bg-card p-1 md:hidden">
          {(
            [
              { id: "calendar" as const, label: "Calendar" },
              { id: "appointments" as const, label: "Bookings" },
              { id: "settings" as const, label: "Settings" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`min-h-[44px] flex-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === id ? "nav-tab-active" : "text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isCalendarLoading && (
          <div className="mb-4 flex items-center gap-2 text-sm text-secondary">
            <Loader2 size={14} className="animate-spin" />
            Updating schedule…
          </div>
        )}

        {activeTab === "calendar" && (
          <CalendarGrid
            config={config}
            slots={slots}
            appointments={calendarAppointments}
            weekAnchor={weekAnchor}
            onWeekChange={setWeekAnchor}
            onSlotSelect={setSelectedSlot}
          />
        )}

        {activeTab === "appointments" && (
          <AppointmentsDashboard
            config={config}
            appointments={allAppointments}
            loading={appointmentsLoading}
            onRefresh={fetchAllAppointments}
          />
        )}

        {activeTab === "settings" && (
          <ConfigPanel
            config={config}
            onSave={updateConfig}
            onSaved={handleConfigSaved}
          />
        )}
      </main>

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          config={config}
          onClose={() => setSelectedSlot(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
