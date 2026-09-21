"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  Contact2,
  Home,
  Phone,
  Plus,
  SquareCheckBig,
  Users as UsersIcon,
} from "lucide-react";
import type { AuthUser } from "@/features/auth/types/auth.types";
import { isSuperAdmin } from "@/features/auth/types/auth.types";
import { teamspaceService } from "@/features/teamspace/services/teamspaceService";
import type { Teamspace } from "@/features/teamspace/types/teamspace.types";

interface SidebarProps {
  user: AuthUser;
  isCollapsed: boolean;
}

const NAV_ITEMS = [
  { href: "/dashboard/leads", label: "Leads", icon: UsersIcon },
  { href: "/dashboard/contacts", label: "Contacts", icon: Contact2 },
  { href: "/dashboard/accounts", label: "Accounts", icon: Building2 },
];

const ACTIVITY_ITEMS = [
  { href: "/dashboard/tasks", label: "Tasks", icon: SquareCheckBig },
  { href: "/dashboard/meetings", label: "Meetings", icon: CalendarClock },
  { href: "/dashboard/calls", label: "Calls", icon: Phone },
];

/**
 * Persistent, docked sidebar — sits beside the page content rather than
 * covering it, so the leads/contacts/accounts table is always usable.
 * `isCollapsed` shrinks it to an icon-only rail (see DashboardHeader's
 * toggle button) instead of hiding it entirely.
 */
export default function Sidebar({ user, isCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [teamspaces, setTeamspaces] = useState<Teamspace[]>([]);
  const [active, setActive] = useState<Teamspace | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setTeamspaces(teamspaceService.list());
    setActive(teamspaceService.getActive());
  }, []);

  // Collapsing hides the switcher's dropdown/create-form entirely.
  useEffect(() => {
    if (isCollapsed) setIsSwitcherOpen(false);
  }, [isCollapsed]);

  function handleSelect(teamspace: Teamspace) {
    teamspaceService.setActive(teamspace.id);
    setActive(teamspace);
    setIsSwitcherOpen(false);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const teamspace = teamspaceService.create(name);
    setTeamspaces(teamspaceService.list());
    setActive(teamspace);
    setNewName("");
    setIsCreating(false);
    setIsSwitcherOpen(false);
  }

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-200 ease-out ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className={`flex items-center px-5 py-5 ${isCollapsed ? "justify-center px-0" : ""}`}>
        <span className="font-serif text-xl text-fg">{isCollapsed ? "L" : "LeadPulse"}</span>
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

      <div className="mt-6 px-3">
        {!isCollapsed && (
          <div className="relative">
            <button
              onClick={() => setIsSwitcherOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft hover:bg-paper"
            >
              <span className="truncate">{active?.name ?? "Teamspace"}</span>
              <ChevronDown size={14} />
            </button>

            {isSwitcherOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-line bg-surface p-1 shadow-lg animate-menu-in">
                {teamspaces.map((teamspace) => (
                  <button
                    key={teamspace.id}
                    onClick={() => handleSelect(teamspace)}
                    className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                      teamspace.id === active?.id
                        ? "bg-slate-light text-fg"
                        : "text-fg hover:bg-paper"
                    }`}
                  >
                    {teamspace.name}
                  </button>
                ))}

                {isSuperAdmin(user) && (
                  <div className="mt-1 border-t border-line pt-1">
                    {isCreating ? (
                      <div className="flex gap-1 p-1">
                        <input
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                          placeholder="Teamspace name"
                          className="w-full rounded border border-line px-2 py-1 text-sm outline-none focus:border-slate"
                        />
                        <button
                          onClick={handleCreate}
                          className="rounded bg-ink px-2 text-xs font-semibold text-white"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsCreating(true)}
                        className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm font-medium text-slate hover:bg-paper"
                      >
                        <Plus size={14} /> Create Teamspace
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <nav className="mt-1 space-y-0.5">
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

      <div className="mt-6 px-3">
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
    </aside>
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
      className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
        isCollapsed ? "justify-center" : ""
      } ${
        isActive
          ? "bg-ink text-white"
          : "text-fg hover:translate-x-0.5 hover:bg-paper hover:shadow-sm"
      }`}
    >
      <Icon size={16} className="shrink-0 transition-transform duration-150 group-hover:scale-110" />
      {!isCollapsed && label}
    </Link>
  );
}
