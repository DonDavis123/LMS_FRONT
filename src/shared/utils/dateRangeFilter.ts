import type { FilterCondition } from "@/shared/components/FilterBar";

/** Inclusive calendar-day range as `YYYY-MM-DD` strings. An empty end is open. */
export interface DateRange {
  from: string;
  to: string;
}

export type DateRangePreset = "today" | "yesterday" | "last7" | "month" | "all";

/** Backend field the list screens filter by. */
export const CREATED_AT_FIELD = "created_at";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date, never `toISOString()` (that is UTC and can be off by a day). */
function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(count: number): string {
  const d = new Date();
  d.setDate(d.getDate() - count);
  return toIso(d);
}

export function todayIso(): string {
  return toIso(new Date());
}

/** The default for the list screens: no dates, i.e. the filter is off. */
export const EMPTY_DATE_RANGE: DateRange = { from: "", to: "" };

/** Today only (the "Today" quick range). */
export function todayRange(): DateRange {
  const today = todayIso();
  return { from: today, to: today };
}

export function presetRange(preset: DateRangePreset): DateRange {
  const today = todayIso();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = daysAgo(1);
      return { from: y, to: y };
    }
    case "last7":
      return { from: daysAgo(6), to: today };
    case "month": {
      const now = new Date();
      return { from: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    }
    case "all":
      return { from: "", to: "" };
  }
}

/** Which preset (if any) the range currently equals, so its chip can show as active. */
export function detectPreset(range: DateRange): DateRangePreset | null {
  const presets: DateRangePreset[] = ["today", "yesterday", "last7", "month", "all"];
  return (
    presets.find((p) => {
      const candidate = presetRange(p);
      return candidate.from === range.from && candidate.to === range.to;
    }) ?? null
  );
}

export function hasDateRange(range: DateRange): boolean {
  return range.from !== "" || range.to !== "";
}

/**
 * Adds the range to a list's filters as a single `created_at` condition.
 * Both ends -> between, only From -> on/after, only To -> on/before.
 * The backend reads these as whole days in the server's time zone.
 */
export function withDateRange(
  filters: FilterCondition[],
  range: DateRange,
  field: string = CREATED_AT_FIELD
): FilterCondition[] {
  const rest = filters.filter((f) => f.field !== field);
  if (range.from && range.to) {
    return [...rest, { field, operator: "between", value: { from: range.from, to: range.to } }];
  }
  if (range.from) return [...rest, { field, operator: "after", value: range.from }];
  if (range.to) return [...rest, { field, operator: "before", value: range.to }];
  return rest;
}
