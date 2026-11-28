"use client";

import { ArrowRight, CalendarRange } from "lucide-react";
import DateInput from "@/shared/components/DateInput";
import {
  detectPreset,
  presetRange,
  type DateRange,
  type DateRangePreset,
} from "@/shared/utils/dateRangeFilter";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Name of the date being filtered, shown at the left of the strip. */
  label?: string;
}

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

/**
 * From / To date strip shown above the list tables. Uses the shared DateInput
 * (typeable + calendar popover) and the same chip style as FilterBar. The two
 * ends can never cross: picking a From after To moves To along, and vice versa.
 * Clearing an end leaves the range open on that side.
 */
export default function DateRangeFilter({ value, onChange, label = "Created" }: DateRangeFilterProps) {
  const active = detectPreset(value);

  function setFrom(from: string) {
    onChange({ from, to: from && value.to && from > value.to ? from : value.to });
  }

  function setTo(to: string) {
    onChange({ from: to && value.from && to < value.from ? to : value.from, to });
  }

  return (
    <div
      role="group"
      aria-label={`${label} date range`}
      className="lp-date-strip flex flex-col gap-3 border-b border-line bg-paper/60 px-3 py-2 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2 sm:px-4"
    >
      <span className="hidden items-center gap-1.5 md:flex text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <CalendarRange size={14} aria-hidden="true" />
        {label}
      </span>

      <div className="grid min-w-0 grid-cols-2 gap-2.5 md:flex md:flex-wrap md:items-center md:gap-2">
        <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-2">
          <span className="text-xs font-medium text-ink-soft">From</span>
          <div className="w-full md:w-[9.75rem]">
            <DateInput value={value.from} onChange={setFrom} ariaLabel="From date" placeholder="Any date" />
          </div>
        </div>
        <ArrowRight size={14} className="hidden text-ink-soft md:block" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-2">
          <span className="text-xs font-medium text-ink-soft">To</span>
          <div className="w-full md:w-[9.75rem]">
            <DateInput value={value.to} onChange={setTo} ariaLabel="To date" placeholder="Any date" />
          </div>
        </div>
      </div>

      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Quick date ranges">
        {PRESETS.map((preset) => {
          const selected = active === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(presetRange(preset.id))}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition active:scale-[0.97] md:px-3 md:py-1.5 ${
                selected
                  ? "border-ink bg-ink text-white shadow-sm"
                  : "border-line bg-surface text-fg hover:border-slate hover:bg-paper"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
