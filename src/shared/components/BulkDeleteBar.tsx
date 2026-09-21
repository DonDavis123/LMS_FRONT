"use client";

import { Trash2, X } from "lucide-react";

interface BulkDeleteBarProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  deleting?: boolean;
}

export default function BulkDeleteBar({ count, onDelete, onClear, deleting = false }: BulkDeleteBarProps) {
  if (!count) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-2.5">
      <span className="text-sm font-medium text-fg">{count} selected</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClear} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-50">
          <X size={14} /> Clear
        </button>
        <button type="button" onClick={onDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
          <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
