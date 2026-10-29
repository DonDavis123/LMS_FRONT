"use client";

import { AlertTriangle, BadgeCheck, CheckCircle2, Copy, EyeOff, Info, List } from "lucide-react";
import type { RowsStatusFilter, ValidateChecked } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";
import {
  buildTiles,
  cannotImportHelp,
  extraSentence,
  summarySentence,
  type ReviewNumbers,
  type TileInfo,
} from "@/features/leadImport/utils/reviewSummary";

const TILE_ICONS: Record<TileInfo["id"], typeof List> = {
  total: List,
  ready: CheckCircle2,
  duplicates: Copy,
  errors: AlertTriangle,
  leftOut: EyeOff,
  converted: BadgeCheck,
};

interface ReviewSummaryProps {
  numbers: ReviewNumbers;
  check: ValidateChecked;
  /** The filter the rows table below is showing. */
  filter: RowsStatusFilter;
  onFilter: (filter: RowsStatusFilter) => void;
  /** The numbers are older than the user's last change. */
  dimmed: boolean;
  onGoToOptions: () => void;
  onGoToMapping: () => void;
}

function Tile({
  tile,
  active,
  onFilter,
}: {
  tile: TileInfo;
  active: boolean;
  onFilter: (filter: RowsStatusFilter) => void;
}) {
  const Icon = TILE_ICONS[tile.id];
  const needsAttention = tile.id === "errors" && tile.value > 0;
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        <Icon size={14} aria-hidden="true" className={needsAttention ? "text-danger" : undefined} />
        <span className="truncate">{tile.label}</span>
      </span>
      <span className={`mt-1 block text-xl font-semibold tabular-nums ${needsAttention ? "text-danger" : "text-fg"}`}>
        {formatCount(tile.value)}
      </span>
      <span className="mt-0.5 block text-xs text-ink-soft">{tile.detail}</span>
    </>
  );

  const base = "min-w-0 rounded-lg border bg-surface p-3 text-left";
  if (tile.filter === null) {
    return <div className={`${base} border-line`}>{body}</div>;
  }

  const filter = tile.filter;
  const empty = tile.value === 0 && !active;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={empty}
      onClick={() => onFilter(active ? "all" : filter)}
      aria-label={`${tile.label}: ${formatCount(tile.value)}. ${active ? "Showing these rows. Press to show all rows." : "Press to show these rows."}`}
      className={`${base} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? "border-slate ring-1 ring-slate" : "border-line hover:bg-paper"
      }`}
    >
      {body}
    </button>
  );
}

/** Six counts, one plain sentence, the warnings, and what to do when nothing can be imported. */
export default function ReviewSummary({
  numbers,
  check,
  filter,
  onFilter,
  dimmed,
  onGoToOptions,
  onGoToMapping,
}: ReviewSummaryProps) {
  const tiles = buildTiles(numbers);
  const extra = extraSentence(numbers);
  const help = check.can_import ? null : cannotImportHelp(numbers);

  return (
    <section aria-label="Summary of your check" className="space-y-3">
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 transition-opacity ${dimmed ? "opacity-60" : ""}`}>
        {tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} active={tile.filter !== null && tile.filter === filter} onFilter={onFilter} />
        ))}
      </div>

      <div className={`transition-opacity ${dimmed ? "opacity-60" : ""}`}>
        <p className="text-sm font-medium text-fg">{summarySentence(numbers)}</p>
        {extra && <p className="mt-0.5 text-xs text-ink-soft">{extra}</p>}
      </div>

      {check.warnings.length > 0 && (
        <div className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2.5 text-sm text-fg">
          <p className="flex items-center gap-1.5 font-medium">
            <Info size={14} className="shrink-0 text-amber-dark" aria-hidden="true" />
            {check.warnings.length === 1 ? "One thing to know" : "Things to know"}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-9 text-ink-soft">
            {check.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {help && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <p className="font-semibold">{help.title}</p>
          <p className="mt-0.5">{help.next}</p>
          {help.target && (
            <div className="mt-2">
              <button
                type="button"
                className={help.target === "options" ? primaryButton : secondaryButton}
                onClick={help.target === "options" ? onGoToOptions : onGoToMapping}
              >
                {help.target === "options" ? "Change options" : "Back to column mapping"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
