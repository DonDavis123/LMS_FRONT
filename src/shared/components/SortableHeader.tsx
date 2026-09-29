"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Menu, X } from "lucide-react";
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
 * Table column header with a per-column sort menu (Asc / Desc / Unsort),
 * modelled on Zoho's list views:
 *  - Devices with a mouse: a menu icon fades in when the header is hovered.
 *  - Touch devices (phones/tablets): no icon; tapping the column name
 *    opens the same menu.
 *  - A star after the column name marks the column the list is sorted by.
 *
 * It only reports the chosen sort — the page sends it to the backend,
 * which orders the full result set before paginating.
 */
export default function SortableHeader({
  label,
  field,
  sort,
  onSortChange,
  className = "px-4 py-3",
}: SortableHeaderProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const activeDirection: SortDirection | null = sort?.field === field ? sort.direction : null;

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
      className={`group ${className}`}
      aria-sort={activeDirection === "asc" ? "ascending" : activeDirection === "desc" ? "descending" : "none"}
    >
      <div ref={anchorRef} className="flex items-center justify-between gap-2">
        {/* Clicking/tapping the name opens the menu — the only way in on touch devices. */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((value) => !value);
          }}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={`Sort options for ${label}`}
          className="flex min-w-0 items-center gap-1 text-left uppercase tracking-wide outline-none focus-visible:underline"
        >
          <span className="truncate">{label}</span>
          {activeDirection && (
            <span aria-hidden="true" className="text-sm font-bold leading-none text-fg">
              *
            </span>
          )}
        </button>

        {/* Hover-only menu icon; hidden entirely on touch devices. */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((value) => !value);
          }}
          aria-hidden="true"
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line bg-surface text-ink-soft transition hover:bg-paper hover:text-fg [@media(hover:none)]:hidden ${
            isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Menu size={12} />
        </button>
      </div>

      {isOpen && (
        <FloatingPopover
          anchorRef={anchorRef}
          onClose={() => setIsOpen(false)}
          width={168}
          ariaLabel={`Sort ${label}`}
        >
          <div className="-m-2 space-y-0.5">
            <button type="button" onClick={() => choose("asc")} className={itemClass(activeDirection === "asc")}>
              <ArrowUp size={14} /> Asc
            </button>
            <button type="button" onClick={() => choose("desc")} className={itemClass(activeDirection === "desc")}>
              <ArrowDown size={14} /> Desc
            </button>
            {activeDirection && (
              <button type="button" onClick={clear} className={itemClass(false)}>
                <X size={14} /> Unsort
              </button>
            )}
          </div>
        </FloatingPopover>
      )}
    </th>
  );
}
