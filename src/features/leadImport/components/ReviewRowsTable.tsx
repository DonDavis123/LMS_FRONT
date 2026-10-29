"use client";

import { ChevronRight, Eye, EyeOff } from "lucide-react";
import { Fragment, useId, useState } from "react";
import type { ImportRowResult } from "@/features/leadImport/types/leadImport.types";
import RowDetails from "@/features/leadImport/components/RowDetails";
import RowResultBadge from "@/features/leadImport/components/RowResultBadge";
import { smallButton, tableHead } from "@/features/leadImport/utils/reviewStyles";
import { rowDetailText, rowLabel, type KeyColumn } from "@/features/leadImport/utils/rowDisplay";
import SelectionIndicator from "@/shared/components/SelectionIndicator";

/** A real checkbox (keyboard and screen reader friendly) drawn with the shared SelectionIndicator. */
function RowCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center p-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        ref={(element) => {
          if (element) element.indeterminate = indeterminate;
        }}
        className="peer sr-only"
      />
      <span className="rounded-[5px] peer-focus-visible:ring-2 peer-focus-visible:ring-amber">
        <SelectionIndicator selected={checked} />
      </span>
    </label>
  );
}

export type RowOverride = "excluded" | "included";

interface ReviewRowsTableProps {
  rows: ImportRowResult[];
  columns: KeyColumn[];
  selected: ReadonlySet<number>;
  onToggle: (row: number) => void;
  onToggleAll: (rows: number[]) => void;
  /** Changes that are saved but not in the counts yet. */
  overrides: ReadonlyMap<number, RowOverride>;
  /** A change is being saved. */
  busy: boolean;
  /** The rows come from an older check. */
  dimmed: boolean;
  onLeaveOut: (row: number) => void;
  onInclude: (row: number) => void;
}

const stickySelect = "sticky left-0 z-20 w-10 min-w-[2.5rem] bg-surface";
const stickyRow = "sticky left-10 z-20 w-20 min-w-[5rem] bg-surface";
const stickyResult = "md:sticky md:left-[7.5rem] md:z-10 bg-surface md:shadow-[1px_0_0_var(--color-line)]";

/** One page of rows: select, row number, key fields, result and details. A row opens to show everything. */
export default function ReviewRowsTable({
  rows,
  columns,
  selected,
  onToggle,
  onToggleAll,
  overrides,
  busy,
  dimmed,
  onLeaveOut,
  onInclude,
}: ReviewRowsTableProps) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  const baseId = useId();

  const pageRows = rows.map((row) => row.row_number);
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row));
  const someSelected = !allSelected && pageRows.some((row) => selected.has(row));
  const columnCount = 5 + columns.length;

  function toggleOpen(row: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }

  return (
    <div className={`overflow-x-auto transition-opacity ${dimmed ? "opacity-60" : ""}`} aria-busy={dimmed || undefined}>
      <table className="w-full min-w-[820px] text-left text-sm">
        <caption className="sr-only">Rows of your file and what will happen to each</caption>
        <thead>
          <tr className={`border-b border-line ${tableHead}`}>
            <th scope="col" className={`${stickySelect} px-2 py-2.5`}>
              <RowCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={() => onToggleAll(pageRows)}
                label="Select all rows on this page"
              />
            </th>
            <th scope="col" className={`${stickyRow} px-2 py-2.5`}>Row</th>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="px-3 py-2.5">
                {column.label}
              </th>
            ))}
            <th scope="col" className={`${stickyResult} px-3 py-2.5`}>Result</th>
            <th scope="col" className="px-3 py-2.5">Details</th>
            <th scope="col" className="px-3 py-2.5 text-right">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const override = overrides.get(row.row_number) ?? null;
            const isOpen = open.has(row.row_number);
            const isSelected = selected.has(row.row_number);
            const excluded = override ? override === "excluded" : row.status === "excluded";
            const detailsId = `${baseId}-${row.row_number}`;
            const rowBg = isSelected ? "bg-slate-light" : "bg-surface";
            const detail = rowDetailText(row);
            return (
              <Fragment key={row.row_number}>
                <tr className={`group border-b border-line align-middle hover:bg-paper ${isSelected ? "bg-slate-light" : ""}`}>
                  <td className={`${stickySelect} px-2 py-2 ${rowBg} group-hover:bg-paper`}>
                    <RowCheckbox
                      checked={isSelected}
                      onChange={() => onToggle(row.row_number)}
                      label={`Select ${rowLabel(row)}`}
                    />
                  </td>
                  <td className={`${stickyRow} px-2 py-2 ${rowBg} group-hover:bg-paper`}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={detailsId}
                      aria-label={`${isOpen ? "Hide" : "Show"} details for ${rowLabel(row)}`}
                      onClick={() => toggleOpen(row.row_number)}
                      className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium tabular-nums text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                    >
                      <ChevronRight
                        size={14}
                        aria-hidden="true"
                        className={`shrink-0 text-ink-soft transition-transform motion-reduce:transition-none ${isOpen ? "rotate-90" : ""}`}
                      />
                      {row.row_number}
                    </button>
                  </td>
                  {columns.map((column) => {
                    const text = column.read(row);
                    return (
                      <td key={column.id} className="max-w-[14rem] truncate px-3 py-2 text-fg" title={text || undefined}>
                        {text || <span className="text-ink-soft">—</span>}
                      </td>
                    );
                  })}
                  <td className={`${stickyResult} px-3 py-2 ${rowBg} group-hover:bg-paper`}>
                    <RowResultBadge status={row.status} pending={override} />
                  </td>
                  <td className="max-w-[16rem] px-3 py-2 text-ink-soft">
                    <span className="line-clamp-2 break-words" title={detail || undefined}>
                      {override ? "Saved. The counts are updating." : detail || "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {excluded ? (
                      <button
                        type="button"
                        className={smallButton}
                        disabled={busy}
                        onClick={() => onInclude(row.row_number)}
                        aria-label={`Include ${rowLabel(row)} again`}
                      >
                        <Eye size={12} aria-hidden="true" />
                        Include again
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={smallButton}
                        disabled={busy}
                        onClick={() => onLeaveOut(row.row_number)}
                        aria-label={`Leave ${rowLabel(row)} out`}
                      >
                        <EyeOff size={12} aria-hidden="true" />
                        Leave out
                      </button>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr id={detailsId} className="border-b border-line bg-paper">
                    <td colSpan={columnCount} className="px-3 py-3">
                      <div className="sticky left-3 w-[calc(100vw-4.5rem)] max-w-3xl">
                        <RowDetails row={row} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
