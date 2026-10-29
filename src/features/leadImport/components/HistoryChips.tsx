"use client";

import { TONE_CLASS } from "@/features/leadImport/components/ReportHeader";
import type { HistoryItem } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { historyStatusChip, isRunningItem, resultChips } from "@/features/leadImport/utils/historyView";

const chipBase = "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium";

/** Status of one import as a chip with text (Running shows a small spinner). */
export function HistoryStatusChip({ item }: { item: HistoryItem }) {
  const chip = historyStatusChip(item);
  return (
    <span className={`${chipBase} ${TONE_CLASS[chip.tone]}`}>
      {isRunningItem(item) && (
        <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-slate/30 border-t-slate" />
      )}
      {chip.label}
    </span>
  );
}

/** Compact result chips: Added, Updated, Skipped, Need attention, Converted. Zeros are hidden. */
export function HistoryResultChips({ item }: { item: HistoryItem }) {
  const chips = resultChips(item);
  if (chips.length === 0) return <span className="text-ink-soft">—</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <li key={chip.key} className={`${chipBase} ${TONE_CLASS[chip.tone]}`}>
          <span className="tabular-nums">{formatCount(chip.value)}</span> {chip.label}
        </li>
      ))}
    </ul>
  );
}
