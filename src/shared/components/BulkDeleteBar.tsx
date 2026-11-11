"use client";

import { Mail, Trash2, X } from "lucide-react";

interface SelectAllMatchingOffer {
  /** How many records match the list's search and filters. */
  total: number;
  /** Every row on the page is ticked, so the offer is shown. */
  pageSelected: boolean;
  /** The selection already means "everything matching". */
  active: boolean;
  onSelectAll: () => void;
}

interface BulkDeleteBarProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  deleting?: boolean;
  /** Adds a "Send Mail" button for the selection. */
  onSendMail?: () => void;
  /**
   * Gmail-style "select all N matching" offer. While it is active the selection
   * is not a list of ticked rows, so Delete is hidden: it only ever applies to
   * rows the user ticked.
   */
  selectAllMatching?: SelectAllMatchingOffer;
}

export default function BulkDeleteBar({
  count,
  onDelete,
  onClear,
  deleting = false,
  onSendMail,
  selectAllMatching,
}: BulkDeleteBarProps) {
  if (!count) return null;
  const allMatchingActive = Boolean(selectAllMatching?.active);
  return (
    <div className="lp-list-head flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line bg-paper px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-fg">
          {allMatchingActive && selectAllMatching
            ? `All ${selectAllMatching.total.toLocaleString()} matching selected`
            : `${count} selected`}
        </span>
        {selectAllMatching && !selectAllMatching.active && selectAllMatching.pageSelected && (
          <button
            type="button"
            onClick={selectAllMatching.onSelectAll}
            className="text-sm font-medium text-slate hover:underline"
          >
            Select all {selectAllMatching.total.toLocaleString()} matching
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClear} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50">
          <X size={14} /> Clear
        </button>
        {onSendMail && (
          <button type="button" onClick={onSendMail} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white hover:bg-ink-2 disabled:opacity-50">
            <Mail size={14} /> Send Mail
          </button>
        )}
        {!allMatchingActive && (
          <button type="button" onClick={onDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
