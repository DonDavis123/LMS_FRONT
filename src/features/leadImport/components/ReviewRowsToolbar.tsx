"use client";

import { Eye, EyeOff, X } from "lucide-react";
import type { ImportRowsCounts, RowsStatusFilter } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";
import { plural } from "@/features/leadImport/utils/reviewSummary";

const TABS: ReadonlyArray<{ value: RowsStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "duplicate", label: "Duplicates" },
  { value: "error", label: "Needs attention" },
  { value: "excluded", label: "Left out" },
  { value: "converted", label: "Converted" },
];

export function filterLabel(filter: RowsStatusFilter): string {
  return TABS.find((tab) => tab.value === filter)?.label ?? "All";
}

interface ReviewFilterTabsProps {
  filter: RowsStatusFilter;
  counts: ImportRowsCounts;
  onChange: (filter: RowsStatusFilter) => void;
}

/** Filter buttons with counts. Plain toggle buttons (aria-pressed), so Tab and Space work everywhere. */
export function ReviewFilterTabs({ filter, counts, onChange }: ReviewFilterTabsProps) {
  return (
    <div role="group" aria-label="Show rows" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
      {TABS.map((tab) => {
        const active = tab.value === filter;
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
              active ? "border-slate bg-slate-light font-semibold text-slate" : "border-line bg-surface text-fg hover:bg-paper"
            }`}
          >
            {tab.label}
            <span className={`text-xs tabular-nums ${active ? "text-slate" : "text-ink-soft"}`}>
              {formatCount(counts[tab.value])}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ReviewBulkBarProps {
  count: number;
  /** "include" on the Left out tab, "leave" everywhere else. */
  mode: "leave" | "include";
  busy: boolean;
  onAction: () => void;
  onClear: () => void;
}

/** Appears above the table when rows are ticked, like the Leads list bulk bar. */
export function ReviewBulkBar({ count, mode, busy, onAction, onClear }: ReviewBulkBarProps) {
  if (count === 0) return null;
  const Icon = mode === "include" ? Eye : EyeOff;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-3 py-2 sm:px-4">
      <span role="status" aria-live="polite" className="text-sm font-medium text-fg">
        {formatCount(count)} {plural(count, "row", "rows")} selected
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className={secondaryButton} onClick={onClear} disabled={busy}>
          <X size={14} aria-hidden="true" />
          Clear
        </button>
        <button type="button" className={primaryButton} onClick={onAction} disabled={busy}>
          <Icon size={14} aria-hidden="true" />
          {busy ? "Saving..." : mode === "include" ? "Include again" : "Leave out"}
        </button>
      </div>
    </div>
  );
}
