"use client";

import { useEffect, useState } from "react";
import { authStorage } from "@/infrastructure/auth/tokenStorage";
import { PicklistService } from "@/features/picklists/services/PicklistService";
import type {
  AccountPicklistField,
  ContactPicklistField,
  LeadPicklistField,
  PicklistModule,
} from "@/features/picklists/types/picklist.types";
import {
  LEAD_INDUSTRIES,
  LEAD_RATINGS,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from "@/features/leads/types/lead.types";
import { ACCOUNT_OWNERSHIP_OPTIONS } from "@/features/accounts/types/account.types";

/** The active option texts of each customisable dropdown, in the company's order. */
export type LeadPicklists = Record<LeadPicklistField, string[]>;
export type ContactPicklists = Record<ContactPicklistField, string[]>;
export type AccountPicklists = Record<AccountPicklistField, string[]>;

export interface PicklistsByModule {
  leads: LeadPicklists;
  contacts: ContactPicklists;
  accounts: AccountPicklists;
}

/**
 * Built-in options. They are only the fallback used before the company's own
 * list has loaded, or if it can't be loaded — the backend still validates
 * every value, so a fallback can never save something the company hid.
 */
export const DEFAULT_LEAD_PICKLISTS: LeadPicklists = {
  lead_source: [...LEAD_SOURCES],
  lead_status: [...LEAD_STATUSES],
  industry: [...LEAD_INDUSTRIES],
  rating: [...LEAD_RATINGS],
};

// Mirrors the backend seed data (contact_lead_source.py / account_options.py).
export const DEFAULT_CONTACT_PICKLISTS: ContactPicklists = {
  lead_source: [...LEAD_SOURCES],
};

export const DEFAULT_ACCOUNT_PICKLISTS: AccountPicklists = {
  industry: [
    "None",
    "ASP (Application Service Provider)",
    "Data/Telecom OEM",
    "ERP (Enterprise Resource Planning)",
    "Government/Military",
    "Large Enterprise",
    "Management",
    "ISV",
    "MSP (Management Service Provider)",
    "Network Equipment Enterprise",
    "Non-management ISV",
    "Optical Networking",
    "Service Provider",
    "Small/Medium Enterprise",
    "Storage Equipment",
    "Storage Service Provider",
    "Systems Integrator",
    "Wireless Industry",
    "ERP",
    "Management ISV",
  ],
  rating: ["None", "Acquired", "Active", "Market Failed", "Project Cancelled", "Shut Down"],
  ownership: [...ACCOUNT_OWNERSHIP_OPTIONS],
};

const DEFAULTS: PicklistsByModule = {
  leads: DEFAULT_LEAD_PICKLISTS,
  contacts: DEFAULT_CONTACT_PICKLISTS,
  accounts: DEFAULT_ACCOUNT_PICKLISTS,
};

// Lists are re-read when a screen opens if they are older than this, so a
// superadmin's change reaches other users' next page without a hard refresh.
const STALE_AFTER_MS = 30_000;

interface CacheEntry<T> {
  data: T;
  at: number;
  /** The signed-in user the list belongs to — never reuse it for another company. */
  ownerId: string | null;
}

interface ModuleState<T> {
  cache: CacheEntry<T> | null;
  inflight: Promise<T> | null;
  inflightOwner: string | null;
}

const state: { [M in PicklistModule]: ModuleState<PicklistsByModule[M]> } = {
  leads: { cache: null, inflight: null, inflightOwner: null },
  contacts: { cache: null, inflight: null, inflightOwner: null },
  accounts: { cache: null, inflight: null, inflightOwner: null },
};

function currentOwnerId(): string | null {
  return authStorage.getUser()?.id ?? null;
}

function validCache<M extends PicklistModule>(module: M): CacheEntry<PicklistsByModule[M]> | null {
  const entry = state[module].cache as unknown as CacheEntry<PicklistsByModule[M]> | null;
  return entry && entry.ownerId === currentOwnerId() ? entry : null;
}

/**
 * Loads (and briefly caches) the company's active dropdown options of one
 * module. Shared by the forms, list filters and detail pages so one screen
 * load costs one request.
 */
export function loadPicklists<M extends PicklistModule>(
  module: M,
  force = false,
): Promise<PicklistsByModule[M]> {
  const slot = state[module] as unknown as ModuleState<PicklistsByModule[M]>;
  const owner = currentOwnerId();
  const cached = validCache(module);
  if (!force && cached && Date.now() - cached.at < STALE_AFTER_MS) {
    return Promise.resolve(cached.data);
  }
  if (slot.inflight && slot.inflightOwner === owner) return slot.inflight;

  const request = PicklistService.getPicklists(module)
    .then((fields) => {
      const data = { ...DEFAULTS[module] } as Record<string, string[]>;
      for (const key of Object.keys(DEFAULTS[module])) {
        const match = fields.find((item) => item.field === key);
        if (!match) continue;
        data[key] = [...match.options]
          .filter((option) => option.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((option) => option.value);
      }
      const result = data as unknown as PicklistsByModule[M];
      slot.cache = { data: result, at: Date.now(), ownerId: owner };
      return result;
    })
    .finally(() => {
      if (slot.inflight === request) {
        slot.inflight = null;
        slot.inflightOwner = null;
      }
    });

  slot.inflight = request;
  slot.inflightOwner = owner;
  return request;
}

/** Call after any change on the admin screen so the next read is fresh. */
export function invalidatePicklists(module: PicklistModule): void {
  state[module].cache = null;
  state[module].inflight = null;
  state[module].inflightOwner = null;
}

export function loadLeadPicklists(force = false): Promise<LeadPicklists> {
  return loadPicklists("leads", force);
}

export function invalidateLeadPicklists(): void {
  invalidatePicklists("leads");
}

/**
 * The company's own options for one module's dropdowns. Renders immediately
 * (from the cache, or the built-in options) and swaps in the company's list
 * when it arrives.
 */
export function usePicklists<M extends PicklistModule>(
  module: M,
): {
  options: PicklistsByModule[M];
  isLoading: boolean;
  error: boolean;
} {
  const [options, setOptions] = useState<PicklistsByModule[M]>(
    () => validCache(module)?.data ?? (DEFAULTS[module] as PicklistsByModule[M]),
  );
  const [isLoading, setIsLoading] = useState(() => validCache(module) === null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPicklists(module)
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        setError(false);
      })
      .catch(() => {
        // Keep whatever is showing; the backend still validates on save.
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [module]);

  return { options, isLoading, error };
}

/** The company's own Lead Source / Status / Industry / Rating options. */
export function useLeadPicklists() {
  return usePicklists("leads");
}

export function useContactPicklists() {
  return usePicklists("contacts");
}

export function useAccountPicklists() {
  return usePicklists("accounts");
}
