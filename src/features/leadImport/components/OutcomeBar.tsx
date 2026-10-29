"use client";

import type { ReportTotals } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { outcomeSegments, segmentPercent } from "@/features/leadImport/utils/reportView";

/** One stacked bar for the parts of the whole, and a legend that says every value in words. */
export default function OutcomeBar({ totals }: { totals: ReportTotals }) {
  const segments = outcomeSegments(totals);
  const visible = segments.filter((segment) => segment.value > 0);
  const summary = visible.map((segment) => `${segment.label} ${formatCount(segment.value)}`).join(", ");

  return (
    <div>
      <div
        role="img"
        aria-label={`Outcome of ${formatCount(totals.total)} rows: ${summary || "no rows"}`}
        className="flex h-3 w-full gap-px overflow-hidden rounded-full bg-line"
      >
        {visible.map((segment) => (
          <div
            key={segment.key}
            className={`h-full ${segment.swatch}`}
            style={{ width: `${segmentPercent(segment, segments)}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-sm ${segment.swatch}`} />
            <span className="min-w-0 flex-1 text-ink-soft">{segment.label}</span>
            <span className="font-medium tabular-nums text-fg">{formatCount(segment.value)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-ink-soft">
              {Math.round(segmentPercent(segment, segments))}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
