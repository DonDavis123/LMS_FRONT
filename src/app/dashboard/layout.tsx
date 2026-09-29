"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/features/dashboard/components/Sidebar";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import { authService } from "@/features/auth/services/authService";
import type { AuthUser } from "@/features/auth/types/auth.types";
import LoadingScreen from "@/shared/components/LoadingScreen";

const SIDEBAR_COLLAPSED_KEY = "crm.sidebar_collapsed";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authService.restoreSession().then((restoredUser) => {
      if (cancelled) return;
      if (!restoredUser) {
        router.replace("/login");
        return;
      }
      setUser(restoredUser);
      setIsSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function handleLogout() {
    await authService.logout();
    router.replace("/login");
  }

  if (!user) {
    return <LoadingScreen label="Checking your session…" />;
  }

  return (
    <div className="lp-app-shell fixed inset-0 flex overflow-hidden bg-paper">
      <Sidebar user={user} isCollapsed={isSidebarCollapsed} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          user={user}
          onLogout={handleLogout}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
        {/* Padding lives on an inner wrapper, NOT on the scroll container, so
            sticky headers stick flush to the top edge with no see-through gap. */}
        <main className="lp-page-bg min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 sm:px-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
