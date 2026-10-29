"use client";

import type { ReportTotals } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";

function Tile({ label, value, note, warn = false }: { label: string; value: number; note?: string; warn?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-2">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${warn && value > 0 ? "text-danger" : "text-fg"}`}>
        {formatCount(value)}
      </dd>
      {note && <p className="text-xs tabular-nums text-ink-soft">{note}</p>}
    </div>
  );
}

export default function ReportStats({ totals }: { totals: ReportTotals }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Tile label="Total rows" value={totals.total} />
      <Tile
        label="Added"
        value={totals.created}
        note={totals.converted > 0 ? `of which ${formatCount(totals.converted)} converted` : undefined}
      />
      <Tile label="Updated" value={totals.updated} />
      <Tile label="Skipped" value={totals.skipped} />
      <Tile label="Need attention" value={totals.failed} warn />
      <Tile label="Left out" value={totals.excluded} />
    </dl>
  );
}
