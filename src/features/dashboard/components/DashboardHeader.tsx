"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { AuthUser } from "@/features/auth/types/auth.types";
import ThemeToggle from "@/shared/components/ThemeToggle";
import NotificationBell from "@/features/notifications/components/NotificationBell";

interface DashboardHeaderProps {
  user: AuthUser;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

/**
 * Persistent top bar shown above the page content. The Sidebar itself is
 * always visible beside the content — this button only minimizes it to an
 * icon rail or maximizes it back, it never hides it entirely.
 */
export default function DashboardHeader({
  user,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line bg-surface/85 px-2.5 py-2 shadow-[0_6px_25px_rgba(18,33,58,0.035)] backdrop-blur-xl sm:gap-4 sm:px-4 sm:py-3">
      <div className="flex flex-1 items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-ink-soft transition hover:border-line hover:bg-paper hover:text-fg active:scale-90"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationBell />
        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-transparent p-1 transition sm:px-2 sm:py-1.5 hover:border-line hover:bg-paper active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-light to-paper text-sm font-bold text-slate shadow-sm">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-fg">{user.name}</p>
              <p className="text-xs leading-tight text-ink-soft">{user.role}</p>
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-line bg-surface p-1 shadow-lg animate-menu-in">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push("/dashboard/reminders");
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-fg hover:bg-paper"
              >
                <AlarmClock size={14} /> Reminder
              </button>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
