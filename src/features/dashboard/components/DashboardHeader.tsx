"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { AuthUser } from "@/features/auth/types/auth.types";
import ThemeToggle from "@/shared/components/ThemeToggle";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import { roleLabel } from "@/features/users/utils/userLabels";

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
 *
 * The profile control shows only the first letter of the user's name; the name, email and role live
 * inside its dropdown together with the Reminder and Log out actions.
 */
export default function DashboardHeader({
  user,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // First letter of the user's name (falls back to email, then "U").
  const initial = (user.name?.trim() || user.email?.trim() || "U").charAt(0).toUpperCase();

  // Close the profile menu on outside click or Escape.
  useEffect(() => {
    if (!isMenuOpen) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

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

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            title="Profile"
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-slate transition hover:border-line hover:bg-paper hover:text-fg active:scale-90 dark:text-ink-soft ${
              isMenuOpen ? "border-line bg-paper text-fg" : "border-transparent"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-light text-slate shadow-sm dark:bg-paper dark:text-fg">
              <span className="text-sm font-bold leading-none">{initial}</span>
            </span>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              style={{ transformOrigin: "top right" }}
              className="absolute right-0 top-full z-20 mt-2 w-64 max-w-[calc(100vw-1.25rem)] rounded-xl border border-line bg-surface p-1.5 shadow-lg animate-menu-in"
            >
              <div className="px-2.5 pb-2.5 pt-2">
                <p className="truncate text-sm font-semibold text-fg" title={user.name}>
                  {user.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-soft" title={user.email}>
                  {user.email}
                </p>
                <span className="mt-2 inline-block rounded-full bg-slate-light px-2 py-0.5 text-[11px] font-medium text-slate dark:bg-paper dark:text-ink-soft">
                  {roleLabel(user.role)}
                </span>
              </div>

              <div className="my-1 h-px bg-line" />

              <button
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push("/dashboard/reminders");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-fg transition hover:bg-paper"
              >
                <AlarmClock size={15} /> Reminder
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-danger transition hover:bg-danger-soft"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
