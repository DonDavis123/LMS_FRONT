"use client";

import { CheckCircle2 } from "lucide-react";
import type { ImportReport } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { notAddedCount } from "@/features/leadImport/utils/reportView";
import { card } from "@/features/leadImport/utils/reviewStyles";

/** Small chips: "Row 61". They wrap on narrow screens. */
export function RowChips({ rows }: { rows: number[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Example rows">
      {rows.map((row) => (
        <li key={row} className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs tabular-nums text-ink-soft">
          Row {row}
        </li>
      ))}
    </ul>
  );
}

export default function OutcomeGroupsList({ report }: { report: ImportReport }) {
  const missing = notAddedCount(report.totals);

  if (missing === 0) {
    return (
      <section className={`${card} flex items-start gap-3 p-4`} aria-labelledby="not-added-title">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={16} aria-hidden="true" />
        </span>
        <div>
          <h2 id="not-added-title" className="text-sm font-semibold text-fg">
            Every row was added or updated
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">Nothing needs fixing in this file.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${card} p-4`} aria-labelledby="not-added-title">
      <h2 id="not-added-title" className="font-serif text-base text-fg">
        Rows that were not added
      </h2>
      <p className="mt-0.5 text-xs text-ink-soft">Here is why each row was not added and how to fix it.</p>
      {report.outcome_groups.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          {formatCount(missing)} {missing === 1 ? "row was" : "rows were"} not added. Download the rows to fix to see the reason for each one.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {report.outcome_groups.map((group) => (
            <li key={group.code} className="rounded-md border border-line bg-paper p-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 break-words text-sm font-semibold text-fg">{group.title}</h3>
                <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-fg">
                  {formatCount(group.count)} {group.count === 1 ? "row" : "rows"}
                </span>
              </div>
              {group.how_to_fix && <p className="mt-1 text-sm text-ink-soft">{group.how_to_fix}</p>}
              {group.example_rows.length > 0 && (
                <div className="mt-2">
                  <RowChips rows={group.example_rows} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
