"use client";

import { AlertTriangle, ChevronDown, EyeOff } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import type { RowProblem, ValidateChecked } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { card, smallButton, tableHead } from "@/features/leadImport/utils/reviewStyles";
import { plural } from "@/features/leadImport/utils/reviewSummary";

interface IssuesPanelProps {
  check: ValidateChecked;
  /** Rows already left out by number, so their button shows as done. */
  leftOutRows: ReadonlySet<number>;
  saving: boolean;
  onLeaveOut: (row: number) => void;
}

function shown(value: string): string {
  return value.trim() === "" ? "(blank)" : value;
}

/** Row 61, Email: "abc" */
function exampleLabel(problem: RowProblem): string {
  const where = problem.column ? `Row ${problem.row_number}, ${problem.column}` : `Row ${problem.row_number}`;
  return problem.value.trim() === "" ? where : `${where}: "${problem.value}"`;
}

/** The problems the check found, with the backend's own words and how to fix each one. */
export default function IssuesPanel({ check, leftOutRows, saving, onLeaveOut }: IssuesPanelProps) {
  const groups = check.error_groups ?? [];
  const problems = check.problems ?? [];
  const groupTotal = groups.reduce((sum, group) => sum + group.count, 0);
  const total = Math.max(groupTotal, problems.length);
  const hasErrors = total > 0;

  const [open, setOpen] = useState(hasErrors);
  // Opens by itself when problems appear; the user's own open/close is kept otherwise.
  useEffect(() => {
    if (hasErrors) setOpen(true);
  }, [hasErrors]);

  const bodyId = useId();

  const exampleByCode = useMemo(() => {
    const map = new Map<string, RowProblem>();
    for (const problem of problems) if (!map.has(problem.code)) map.set(problem.code, problem);
    return map;
  }, [problems]);

  return (
    <section aria-label="Problems found" className={card}>
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber sm:px-4"
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-ink-soft transition-transform motion-reduce:transition-none ${open ? "" : "-rotate-90"}`}
          />
          <span className="text-sm font-semibold text-fg">Problems to fix</span>
          {hasErrors ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
              <AlertTriangle size={12} aria-hidden="true" />
              {formatCount(total)} {plural(total, "problem", "problems")}
            </span>
          ) : (
            <span className="text-xs text-ink-soft">None found</span>
          )}
        </button>
      </h2>

      {open && (
        <div id={bodyId} className="space-y-4 border-t border-line px-3 py-3 sm:px-4">
          {!hasErrors && <p className="text-sm text-ink-soft">No problems were found in the rows that will be imported.</p>}

          {groups.length > 0 && (
            <ul className="space-y-2">
              {groups.map((group) => {
                const example = exampleByCode.get(group.code);
                return (
                  <li key={group.code} className="text-sm">
                    <p className="font-medium text-fg">
                      {formatCount(group.count)} {plural(group.count, "row", "rows")}: {group.label}
                    </p>
                    {example && (
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {exampleLabel(example)}. {example.message}
                        {example.how_to_fix ? ` How to fix: ${example.how_to_fix}` : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {problems.length > 0 && (
            <div>
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <caption className="sr-only">The first {problems.length} problems found</caption>
                  <thead>
                    <tr className={`border-b border-line bg-paper ${tableHead}`}>
                      <th scope="col" className="px-3 py-2">Row</th>
                      <th scope="col" className="px-3 py-2">Column</th>
                      <th scope="col" className="px-3 py-2">Value found</th>
                      <th scope="col" className="px-3 py-2">What is wrong</th>
                      <th scope="col" className="px-3 py-2">How to fix</th>
                      <th scope="col" className="px-3 py-2"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.map((problem, index) => {
                      const done = leftOutRows.has(problem.row_number);
                      return (
                        <tr key={`${problem.row_number}-${problem.field}-${problem.code}-${index}`} className="border-b border-line align-top last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-fg">{problem.row_number}</td>
                          <td className="px-3 py-2 text-fg">{problem.column || "—"}</td>
                          <td className="max-w-[12rem] break-words px-3 py-2 text-ink-soft">{shown(problem.value)}</td>
                          <td className="px-3 py-2 text-fg">{problem.message}</td>
                          <td className="px-3 py-2 text-ink-soft">{problem.how_to_fix || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            {done ? (
                              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                                <EyeOff size={12} aria-hidden="true" />
                                Left out
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={smallButton}
                                disabled={saving}
                                onClick={() => onLeaveOut(problem.row_number)}
                                aria-label={`Leave row ${problem.row_number} out`}
                              >
                                Leave this row out
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {total > problems.length && (
                <p className="mt-2 text-xs text-ink-soft">
                  Showing {formatCount(problems.length)} of {formatCount(total)} problems. The rows table lists all of them.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
