"use client";

import { useEffect, useState } from "react";
import { authStorage } from "@/infrastructure/auth/tokenStorage";
import { PicklistService } from "@/features/picklists/services/PicklistService";
import type { LeadPicklistField } from "@/features/picklists/types/picklist.types";
import {
  LEAD_INDUSTRIES,
  LEAD_RATINGS,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from "@/features/leads/types/lead.types";

/** The active option texts of each customisable Lead dropdown, in the company's order. */
export type LeadPicklists = Record<LeadPicklistField, string[]>;

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

const FIELDS = Object.keys(DEFAULT_LEAD_PICKLISTS) as LeadPicklistField[];

// Lists are re-read when a screen opens if they are older than this, so a
// superadmin's change reaches other users' next page without a hard refresh.
const STALE_AFTER_MS = 30_000;

interface CacheEntry {
  data: LeadPicklists;
  at: number;
  /** The signed-in user the list belongs to — never reuse it for another company. */
  ownerId: string | null;
}

let cache: CacheEntry | null = null;
let inflight: Promise<LeadPicklists> | null = null;
let inflightOwner: string | null = null;

function currentOwnerId(): string | null {
  return authStorage.getUser()?.id ?? null;
}

function validCache(): CacheEntry | null {
  return cache && cache.ownerId === currentOwnerId() ? cache : null;
}

/**
 * Loads (and briefly caches) the company's active Lead dropdown options.
 * Shared by the forms, the list filters, the status bar and the dashboard so
 * one screen load costs one request.
 */
export function loadLeadPicklists(force = false): Promise<LeadPicklists> {
  const owner = currentOwnerId();
  const cached = validCache();
  if (!force && cached && Date.now() - cached.at < STALE_AFTER_MS) {
    return Promise.resolve(cached.data);
  }
  if (inflight && inflightOwner === owner) return inflight;

  const request = PicklistService.getLeadPicklists()
    .then((fields) => {
      const data = { ...DEFAULT_LEAD_PICKLISTS } as LeadPicklists;
      for (const key of FIELDS) {
        const match = fields.find((item) => item.field === key);
        if (!match) continue;
        data[key] = [...match.options]
          .filter((option) => option.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((option) => option.value);
      }
      cache = { data, at: Date.now(), ownerId: owner };
      return data;
    })
    .finally(() => {
      if (inflight === request) {
        inflight = null;
        inflightOwner = null;
      }
    });

  inflight = request;
  inflightOwner = owner;
  return request;
}

/** Call after any change on the admin screen so the next read is fresh. */
export function invalidateLeadPicklists(): void {
  cache = null;
  inflight = null;
  inflightOwner = null;
}

/**
 * The company's own Lead Source / Status / Industry / Rating options for
 * forms, filters and status bars. Renders immediately (from the cache, or the
 * built-in options) and swaps in the company's list when it arrives.
 */
export function useLeadPicklists(): {
  options: LeadPicklists;
  isLoading: boolean;
  error: boolean;
} {
  const [options, setOptions] = useState<LeadPicklists>(
    () => validCache()?.data ?? DEFAULT_LEAD_PICKLISTS,
  );
  const [isLoading, setIsLoading] = useState(() => validCache() === null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeadPicklists()
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
  }, []);

  return { options, isLoading, error };
}
