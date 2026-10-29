"use client";

import { AlertTriangle, CheckCircle2, RotateCcw, EyeOff } from "lucide-react";
import SearchBox from "@/shared/components/SearchBox";
import { formatCount } from "@/features/leadImport/utils/format";
import type { MappingSummary, RequiredFieldStatus } from "@/features/leadImport/utils/mappingRules";

interface MappingToolbarProps {
  summary: MappingSummary;
  required: RequiredFieldStatus[];
  query: string;
  onQueryChange: (query: string) => void;
  canReset: boolean;
  onReset: () => void;
  unmatchedCount: number;
  onIgnoreUnmatched: () => void;
}

const secondaryButton =
  "inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

function Chip({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "success" }) {
  const tones = { slate: "bg-slate-light text-slate", success: "bg-success-soft text-success" } as const;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** Counts, required-field status, search and the two bulk actions. */
export default function MappingToolbar({
  summary,
  required,
  query,
  onQueryChange,
  canReset,
  onReset,
  unmatchedCount,
  onIgnoreUnmatched,
}: MappingToolbarProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-3 sm:p-4" aria-label="Column mapping summary">
      <ul className="flex flex-wrap gap-2" aria-label="Mapping summary" aria-live="polite">
        <li>
          <Chip tone={summary.imported > 0 ? "success" : "slate"}>
            {formatCount(summary.imported)} of {formatCount(summary.total)}{" "}
            {summary.total === 1 ? "column" : "columns"} will be imported
          </Chip>
        </li>
        <li>
          <Chip>{formatCount(summary.ignored)} ignored</Chip>
        </li>
        {summary.kept > 0 && (
          <li>
            <Chip>{formatCount(summary.kept)} kept in description</Chip>
          </li>
        )}
      </ul>

      {required.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-semibold text-ink-soft">Required fields</span>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {required.map(({ field, mapped, viaCompany }) => (
              <li key={field.key} className={`inline-flex items-center gap-1 font-medium ${mapped ? "text-success" : "text-fg"}`}>
                {mapped ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-dark" aria-hidden="true" />
                )}
                {field.label}
                <span className="font-normal text-ink-soft">
                  {mapped ? (viaCompany ? "(from company name)" : "mapped") : "not mapped yet"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox
          value={query}
          onSearchChange={onQueryChange}
          placeholder="Find a column…"
          ariaLabel="Find a column in your file by name"
        />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button type="button" className={secondaryButton} onClick={onReset} disabled={!canReset}>
            <RotateCcw size={14} aria-hidden="true" />
            Reset to suggestions
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={onIgnoreUnmatched}
            disabled={unmatchedCount === 0}
            title="Switch off columns we could not match with confidence. Columns you chose yourself are kept."
          >
            <EyeOff size={14} aria-hidden="true" />
            Ignore all unmatched{unmatchedCount > 0 ? ` (${formatCount(unmatchedCount)})` : ""}
          </button>
        </div>
      </div>
    </section>
  );
}
