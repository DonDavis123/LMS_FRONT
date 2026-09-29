"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import FloatingPopover from "@/shared/components/FloatingPopover";
import type { SortDirection, SortState } from "@/shared/types/sort";

interface SortableHeaderProps {
  label: string;
  /** Backend sort key for this column. */
  field: string;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  className?: string;
}

/**
 * Table column header with a small sort menu (Ascending / Descending),
 * mirroring the per-column sort option in Zoho's list views. It only reports
 * the chosen sort — the page sends it to the backend, which orders the full
 * result set before paginating.
 */
export default function SortableHeader({
  label,
  field,
  sort,
  onSortChange,
  className = "px-4 py-3",
}: SortableHeaderProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const activeDirection: SortDirection | null = sort?.field === field ? sort.direction : null;
  const Icon = activeDirection === "asc" ? ArrowUp : activeDirection === "desc" ? ArrowDown : ArrowUpDown;

  function choose(direction: SortDirection) {
    onSortChange({ field, direction });
    setIsOpen(false);
  }

  function clear() {
    onSortChange(null);
    setIsOpen(false);
  }

  const itemClass = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-normal normal-case tracking-normal transition hover:bg-paper ${
      active ? "bg-paper font-medium text-fg" : "text-fg"
    }`;

  return (
    <th
      className={className}
      aria-sort={activeDirection === "asc" ? "ascending" : activeDirection === "desc" ? "descending" : "none"}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        <button
          ref={buttonRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((value) => !value);
          }}
          aria-label={`Sort by ${label}`}
          aria-expanded={isOpen}
          className={`flex h-5 w-5 items-center justify-center rounded transition hover:bg-paper hover:text-fg ${
            activeDirection ? "text-slate" : "text-ink-soft/60"
          }`}
        >
          <Icon size={13} />
        </button>
      </div>

      {isOpen && (
        <FloatingPopover
          anchorRef={buttonRef}
          onClose={() => setIsOpen(false)}
          width={168}
          ariaLabel={`Sort ${label}`}
        >
          <div className="-m-2 space-y-0.5">
            <button type="button" onClick={() => choose("asc")} className={itemClass(activeDirection === "asc")}>
              <ArrowUp size={14} /> Ascending
            </button>
            <button type="button" onClick={() => choose("desc")} className={itemClass(activeDirection === "desc")}>
              <ArrowDown size={14} /> Descending
            </button>
            {activeDirection && (
              <button type="button" onClick={clear} className={itemClass(false)}>
                <X size={14} /> Clear sort
              </button>
            )}
          </div>
        </FloatingPopover>
      )}
    </th>
  );
}
