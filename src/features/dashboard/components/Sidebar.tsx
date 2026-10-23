"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Contact2,
  Home,
  ListChecks,
  Phone,
  QrCode,
  ShieldCheck,
  SquareCheckBig,
  Users as UsersIcon,
} from "lucide-react";
import type { AuthUser } from "@/features/auth/types/auth.types";
import { isSuperAdmin } from "@/features/auth/types/auth.types";
import { CALLS_ENABLED } from "@/features/calls/config";

interface SidebarProps {
  user: AuthUser;
  /** Icon-rail mode. Only ever true on desktop (the parent guarantees it). */
  isCollapsed: boolean;
  /** md+ viewport: docked beside the content. Otherwise: off-canvas drawer. */
  isDesktop: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS = [
  { href: "/dashboard/leads", label: "Leads", icon: UsersIcon },
  { href: "/dashboard/contacts", label: "Contacts", icon: Contact2 },
  { href: "/dashboard/accounts", label: "Accounts", icon: Building2 },
];

const ACTIVITY_ITEMS = [
  { href: "/dashboard/tasks", label: "Tasks", icon: SquareCheckBig },
  { href: "/dashboard/meetings", label: "Meetings", icon: CalendarClock },
  ...(CALLS_ENABLED ? [{ href: "/dashboard/calls", label: "Calls", icon: Phone }] : []),
];

/**
 * Persistent, docked sidebar — sits beside the page content rather than
 * covering it, so the leads/contacts/accounts table is always usable.
 * `isCollapsed` shrinks it to an icon-only rail (see DashboardHeader's
 * toggle button) instead of hiding it entirely.
 */
export default function Sidebar({
  user,
  isCollapsed,
  isDesktop,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  return (
    <>
      {/* Mobile only: dims the page behind the open drawer; tap to dismiss. */}
      {!isDesktop && isMobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          className="animate-drawer-backdrop fixed inset-0 z-[45] bg-black/45 backdrop-blur-[2px]"
        />
      )}
    <aside
      aria-label="Main navigation"
      inert={!isDesktop && !isMobileOpen}
      className={`flex shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-line bg-surface shadow-[8px_0_30px_rgba(18,33,58,0.035)] ${
        isDesktop
          ? `h-full bg-surface/95 backdrop-blur-xl transition-[width] duration-300 ease-out ${
              isCollapsed ? "w-16" : "w-64"
            }`
          : `fixed inset-y-0 left-0 z-50 w-[17rem] max-w-[85vw] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isMobileOpen ? "translate-x-0" : "-translate-x-full"
            }`
      }`}
    >
      <div className={`flex items-center px-5 py-4 md:py-5 ${isCollapsed ? "justify-center px-0" : ""}`}>
        <div className={`flex items-center gap-2.5 ${isCollapsed ? "" : ""}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-black text-white shadow-md animate-soft-glow">L</span>{!isCollapsed && <div><span className="block font-serif text-xl leading-none text-fg">LeadPulse</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-ink-soft">CRM workspace</span></div>}</div>
      </div>

      <nav className="px-3">
        <SidebarLink
          href="/dashboard"
          icon={Home}
          label="Home"
          isActive={pathname === "/dashboard"}
          isCollapsed={isCollapsed}
        />
      </nav>

      <div className="mt-4 px-3 md:mt-6">
        {!isCollapsed && (
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            CRM
          </p>
        )}
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname.startsWith(item.href)}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </div>

      <div className="mt-4 px-3 md:mt-6">
        {!isCollapsed && (
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Activities
          </p>
        )}
        <nav className="space-y-0.5">
          {ACTIVITY_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname.startsWith(item.href)}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </div>

      {isSuperAdmin(user) && (
        <div className="mt-4 px-3 md:mt-6">
          {!isCollapsed && (
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Administration
            </p>
          )}
          <nav className="space-y-0.5">
            <SidebarLink
              href="/dashboard/users"
              icon={ShieldCheck}
              label="Users"
              isActive={pathname.startsWith("/dashboard/users")}
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              href="/dashboard/dropdown-options"
              icon={ListChecks}
              label="Dropdown Options"
              isActive={pathname.startsWith("/dashboard/dropdown-options")}
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              href="/dashboard/lead-form"
              icon={QrCode}
              label="Lead Form"
              isActive={pathname.startsWith("/dashboard/lead-form")}
              isCollapsed={isCollapsed}
            />
          </nav>
        </div>
      )}
    </aside>
    </>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
        isCollapsed ? "justify-center" : ""
      } ${
        isActive
          ? "bg-ink text-white shadow-md shadow-ink/10"
          : "text-fg hover:translate-x-0.5 hover:bg-paper hover:shadow-sm"
      }`}
    >
      <Icon size={16} className="shrink-0 transition-transform duration-150 group-hover:scale-110" />
      {!isCollapsed && label}
    </Link>
  );
}
