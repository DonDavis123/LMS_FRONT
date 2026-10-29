"use client";

import type { ProgressResult } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { useCountUp } from "@/shared/hooks/useCountUp";

function CounterTile({ label, value, warn = false, wide = false }: { label: string; value: number; warn?: boolean; wide?: boolean }) {
  const shown = useCountUp(value, 400);
  return (
    <div className={`rounded-md border border-line bg-paper px-3 py-2 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${warn && value > 0 ? "text-danger" : "text-fg"}`}>
        {formatCount(shown)}
      </dd>
    </div>
  );
}

/** The five live counters. Two columns on a phone, five in a row from sm up. */
export default function ImportCounterTiles({ progress }: { progress: ProgressResult | null }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <CounterTile label="Added" value={progress?.created ?? 0} />
      <CounterTile label="Updated" value={progress?.updated ?? 0} />
      <CounterTile label="Skipped" value={progress?.skipped ?? 0} />
      <CounterTile label="Need attention" value={progress?.failed ?? 0} warn />
      <CounterTile label="Converted" value={progress?.converted ?? 0} wide />
    </dl>
  );
}
