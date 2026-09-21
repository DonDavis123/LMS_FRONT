import type { Teamspace } from "@/features/teamspace/types/teamspace.types";

/**
 * There's no `/teamspaces/` endpoint on the backend yet, so this is kept
 * client-side (localStorage) for now — same shape a real API would return,
 * so swapping this for `apiClient` calls later is a small change.
 */
const STORAGE_KEY = "crm.teamspaces";
const ACTIVE_KEY = "crm.active_teamspace";
const DEFAULT_TEAMSPACE: Teamspace = {
  id: "default",
  name: "CRM Teamspace",
  createdAt: new Date(0).toISOString(),
};

const isBrowser = () => typeof window !== "undefined";

function readAll(): Teamspace[] {
  if (!isBrowser()) return [DEFAULT_TEAMSPACE];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [DEFAULT_TEAMSPACE];
  try {
    const parsed = JSON.parse(raw) as Teamspace[];
    return parsed.length ? parsed : [DEFAULT_TEAMSPACE];
  } catch {
    return [DEFAULT_TEAMSPACE];
  }
}

function writeAll(teamspaces: Teamspace[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(teamspaces));
}

export const teamspaceService = {
  list(): Teamspace[] {
    return readAll();
  },

  create(name: string): Teamspace {
    const teamspace: Teamspace = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };
    const all = [...readAll(), teamspace];
    writeAll(all);
    this.setActive(teamspace.id);
    return teamspace;
  },

  getActiveId(): string {
    if (!isBrowser()) return DEFAULT_TEAMSPACE.id;
    return window.localStorage.getItem(ACTIVE_KEY) ?? DEFAULT_TEAMSPACE.id;
  },

  setActive(id: string): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACTIVE_KEY, id);
  },

  getActive(): Teamspace {
    const activeId = this.getActiveId();
    return readAll().find((t) => t.id === activeId) ?? DEFAULT_TEAMSPACE;
  },
};
