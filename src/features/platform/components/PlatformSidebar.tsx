"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, History, LayoutDashboard } from "lucide-react";

interface PlatformSidebarProps {
  /** Icon-rail mode. Only ever true on desktop (the parent guarantees it). */
  isCollapsed: boolean;
  /** md+ viewport: docked beside the content. Otherwise: off-canvas drawer. */
  isDesktop: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const PLATFORM_ITEMS = [
  { href: "/platform/companies", label: "Companies", icon: Building2 },
  { href: "/platform/audit-logs", label: "Audit log", icon: History },
];

/**
 * Sidebar of the platform admin workspace. It mirrors the company
 * `Sidebar` (docked on desktop, collapsible to an icon rail, off-canvas
 * drawer on phones) but only links to platform pages — platform admins
 * belong to no company, so there are no leads, contacts or activities.
 */
export default function PlatformSidebar({
  isCollapsed,
  isDesktop,
  isMobileOpen,
  onCloseMobile,
}: PlatformSidebarProps) {
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
        aria-label="Platform navigation"
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
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sm font-black text-white shadow-md animate-soft-glow">
              L
            </span>
            {!isCollapsed && (
              <div>
                <span className="block font-serif text-xl leading-none text-fg">LeadPulse</span>
                <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-ink-soft">
                  Platform admin
                </span>
              </div>
            )}
          </div>
        </div>

        <nav className="px-3">
          <PlatformLink
            href="/platform"
            icon={LayoutDashboard}
            label="Overview"
            isActive={pathname === "/platform"}
            isCollapsed={isCollapsed}
          />
        </nav>

        <div className="mt-4 px-3 md:mt-6">
          {!isCollapsed && (
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Platform</p>
          )}
          <nav className="space-y-0.5">
            {PLATFORM_ITEMS.map((item) => (
              <PlatformLink
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
      </aside>
    </>
  );
}

function PlatformLink({
  href,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
}: {
  href: string;
  icon: typeof LayoutDashboard;
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
