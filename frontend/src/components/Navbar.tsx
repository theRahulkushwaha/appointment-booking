import { Calendar, ClipboardList, LogOut, Menu, Moon, Settings, Sun, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export type AppTab = "calendar" | "appointments" | "settings";

interface NavbarProps {
  timezone: string;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: { id: AppTab; label: string; icon: typeof Calendar }[] = [
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "appointments", label: "Appointments", icon: ClipboardList },
  { id: "settings", label: "Settings", icon: Settings },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Navbar({ timezone, activeTab, onTabChange }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabButtons = (
    <>
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            onTabChange(id);
            setMenuOpen(false);
          }}
          className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out md:flex-1 ${
            activeTab === id ? "nav-tab-active" : "text-secondary hover:bg-hover hover:text-primary"
          }`}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </>
  );

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-secondary transition-all duration-200 hover:bg-hover md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="font-heading text-xl font-bold tracking-tight text-primary md:text-2xl">
              BookSlot
            </h1>
          </div>

          <p className="hidden text-sm text-secondary sm:block">
            <span className="hidden md:inline">Timezone: </span>
            <span className="font-medium text-accent">{timezone}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-secondary transition-all duration-200 hover:bg-hover hover:text-primary"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user && (
              <div className="hidden items-center gap-2 sm:flex">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-white"
                  title={user.name}
                >
                  {getInitials(user.name)}
                </div>
                <span className="max-w-[120px] truncate text-sm text-primary">{user.name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border text-secondary transition-all duration-200 hover:border-danger/50 hover:text-danger"
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <div className="mb-3 flex flex-col gap-2">{tabButtons}</div>
            {user && (
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {getInitials(user.name)}
                  </div>
                  <span className="text-sm text-primary">{user.name}</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm text-danger transition-all duration-200"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
            <p className="mt-2 text-xs text-secondary sm:hidden">TZ: {timezone}</p>
          </div>
        )}
      </nav>

      <div className="mx-auto hidden max-w-6xl gap-2 px-4 pb-4 md:flex">
        <div className="flex w-full gap-2 rounded-xl border border-border bg-card p-1 card-surface">
          {tabButtons}
        </div>
      </div>
    </>
  );
}
