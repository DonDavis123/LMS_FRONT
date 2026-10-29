"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  Copy,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { PreviewRetryCard } from "@/features/leadImport/components/MappingMessages";
import type { ImportFieldDef, PreviewRow, RowProblem, RowStatus } from "@/features/leadImport/types/leadImport.types";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { rowStatusLabel } from "@/features/leadImport/utils/labels";
import { formatCell } from "@/features/leadImport/utils/mappingRules";

export type PreviewState = "empty" | "loading" | "blocked" | "failed" | "ready";

interface MappingPreviewTableProps {
  state: PreviewState;
  columns: ImportFieldDef[];
  rows: PreviewRow[];
  /** Old rows kept on screen while a new answer is on its way. */
  dimmed: boolean;
  error: ImportErrorInfo | null;
  onRetry: () => void;
}

const STATUS_STYLE: Record<RowStatus, { Icon: LucideIcon; className: string }> = {
  ready: { Icon: CheckCircle2, className: "bg-success-soft text-success" },
  convert: { Icon: UserRoundCheck, className: "bg-slate-light text-slate" },
  duplicate_skip: { Icon: Copy, className: "bg-amber/15 text-fg" },
  duplicate_update: { Icon: Copy, className: "bg-amber/15 text-fg" },
  duplicate_create: { Icon: Copy, className: "bg-amber/15 text-fg" },
  excluded: { Icon: CircleSlash, className: "border border-line bg-paper text-ink-soft" },
  error: { Icon: AlertCircle, className: "bg-danger-soft text-danger" },
};

function StatusBadge({ status }: { status: RowStatus }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.excluded;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}>
      <style.Icon size={13} aria-hidden="true" />
      {rowStatusLabel(status)}
    </span>
  );
}

// Fixed width of the Row column, so the second sticky column can sit right after it.
const ROW_COL = "w-[4.5rem] min-w-[4.5rem] max-w-[4.5rem]";
const STICKY_ROW = "sticky left-0 z-10 bg-surface";
const STICKY_SECOND = "sticky left-[4.5rem] z-10 bg-surface border-r border-line";
const HEAD_CELL = "border-b border-line px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-soft whitespace-nowrap";

function problemText(problem: RowProblem): string {
  return [problem.message, problem.how_to_fix].filter(Boolean).join(" ");
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <div className="space-y-2 p-3 sm:p-4" aria-busy="true">
      <p role="status" className="text-sm font-medium text-ink-soft">
        Checking your mapping...
      </p>
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: Math.min(Math.max(columns, 3), 6) + 1 }, (_, cell) => (
            <div key={cell} className={`h-7 animate-shimmer rounded ${cell === 0 ? "w-12" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function RowDetails({ row, colSpan }: { row: PreviewRow; colSpan: number }) {
  return (
    <tr className="bg-paper">
      <td colSpan={colSpan} className="border-b border-line p-0">
        <div className="sticky left-0 w-max max-w-[min(44rem,calc(100vw-4rem))] space-y-2 px-4 py-3 text-sm">
          {row.reason && <p className="text-ink-soft">{row.reason}</p>}
          {row.problems.length > 0 && (
            <ul className="space-y-1.5" aria-label={`Problems in row ${row.row_number}`}>
              {row.problems.map((problem, index) => (
                <li key={`${index}-${problem.code}`} className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                  <span className="min-w-0 break-words text-fg">
                    <span className="font-medium">{problem.column || problem.field}:</span> {problem.message}
                    {problem.how_to_fix && <span className="text-ink-soft"> How to fix: {problem.how_to_fix}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {row.warnings.length > 0 && (
            <ul className="space-y-1.5" aria-label={`Warnings for row ${row.row_number}`}>
              {row.warnings.map((warning, index) => (
                <li key={`${index}-${warning.code}`} className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-dark" aria-hidden="true" />
                  <span className="min-w-0 break-words text-fg">{warning.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </td>
    </tr>
  );
}

/** The first rows of the file, run through the real import code. */
export default function MappingPreviewTable({ state, columns, rows, dimmed, error, onRetry }: MappingPreviewTableProps) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const colSpan = columns.length + 2;

  function toggle(rowNumber: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  }

  return (
    <section className="rounded-lg border border-line bg-surface" aria-labelledby="import-preview-title">
      <div className="border-b border-line px-3 py-3 sm:px-4">
        <h3 id="import-preview-title" className="text-sm font-semibold text-fg">
          Preview of the first 15 rows
        </h3>
        <p className="text-xs text-ink-soft">This is exactly how these rows would be imported.</p>
      </div>

      {state === "empty" && <p className="px-4 py-8 text-center text-sm text-ink-soft">Map at least one column to see a preview</p>}
      {state === "blocked" && (
        <p className="px-4 py-8 text-center text-sm text-ink-soft">Fix the problems above to see a preview.</p>
      )}
      {state === "loading" && <SkeletonRows columns={columns.length} />}
      {state === "failed" && error && <PreviewRetryCard error={error} onRetry={onRetry} />}

      {state === "ready" && rows.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-ink-soft">Your file has no rows with data to preview.</p>
      )}

      {state === "ready" && rows.length > 0 && (
        <div className={`overflow-x-auto transition-opacity ${dimmed ? "opacity-60" : ""}`} aria-busy={dimmed}>
          <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
            <caption className="sr-only">Preview of the first rows as they would be imported</caption>
            <thead>
              <tr>
                <th scope="col" className={`${HEAD_CELL} ${ROW_COL} ${STICKY_ROW}`}>
                  Row
                </th>
                {columns.map((column, index) => (
                  <th key={column.key} scope="col" className={`${HEAD_CELL} ${index === 0 ? STICKY_SECOND : ""}`}>
                    {column.label}
                  </th>
                ))}
                <th scope="col" className={HEAD_CELL}>
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expandable = row.problems.length > 0 || row.warnings.length > 0;
                const expanded = expandable && open.has(row.row_number);
                return (
                  <Fragment key={row.row_number}>
                    <tr>
                      <th
                        scope="row"
                        className={`${STICKY_ROW} ${ROW_COL} border-b border-line px-2 py-2 text-left text-xs font-normal tabular-nums text-ink-soft`}
                      >
                        <span className="flex items-center gap-1">
                          {expandable ? (
                            <button
                              type="button"
                              onClick={() => toggle(row.row_number)}
                              aria-expanded={expanded}
                              aria-label={`${expanded ? "Hide" : "Show"} details for row ${row.row_number}`}
                              className="rounded p-0.5 text-ink-soft hover:bg-paper hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                            >
                              <ChevronRight
                                size={14}
                                className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                                aria-hidden="true"
                              />
                            </button>
                          ) : (
                            <span className="inline-block w-[22px]" aria-hidden="true" />
                          )}
                          {row.row_number}
                        </span>
                      </th>
                      {columns.map((column, index) => {
                        const text = formatCell(row.values_by_field[column.key]);
                        const problem = row.problems.find((item) => item.field === column.key);
                        return (
                          <td
                            key={column.key}
                            className={`max-w-[14rem] border-b border-line px-3 py-2 text-fg ${index === 0 ? STICKY_SECOND : ""}`}
                          >
                            <span
                              className={`block truncate ${
                                problem ? "underline decoration-danger decoration-2 underline-offset-4" : ""
                              }`}
                              title={problem ? problemText(problem) : text || undefined}
                            >
                              {text || <span className="text-ink-soft">—</span>}
                              {problem && <span className="sr-only"> Problem: {problemText(problem)}</span>}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border-b border-line px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                    {expanded && <RowDetails row={row} colSpan={colSpan} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
