import { SearchX } from "lucide-react";
import type { RowsStatusFilter } from "@/features/leadImport/types/leadImport.types";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { secondaryButton } from "@/features/leadImport/utils/reviewStyles";

export function RowsSkeleton() {
  return (
    <div className="space-y-2 p-3 sm:p-4" aria-busy="true" aria-label="Loading rows">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-10 animate-shimmer rounded-md" />
      ))}
    </div>
  );
}

const EMPTY_TEXT: Record<RowsStatusFilter, { title: string; body: string }> = {
  all: { title: "No rows to show", body: "This file has no rows to list." },
  ready: { title: "No rows are ready yet", body: "Rows without problems that will be added appear here." },
  duplicate: { title: "No duplicates found", body: "None of your rows match a lead you already have or repeat inside the file." },
  error: { title: "No rows need attention", body: "Every row that will be imported looks fine." },
  excluded: { title: "No rows are left out", body: "Rows you leave out, by hand or by rule, appear here so you can bring them back." },
  converted: { title: "No converted rows", body: "Rows marked as converted in your file appear here." },
};

interface RowsEmptyStateProps {
  filter: RowsStatusFilter;
  searching: boolean;
  onShowAll: () => void;
}

export function RowsEmptyState({ filter, searching, onShowAll }: RowsEmptyStateProps) {
  const text = searching
    ? { title: "No rows match your search", body: "Try a different name, email or row number, or remove the search." }
    : EMPTY_TEXT[filter];
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center animate-scale-in">
      <SearchX size={22} className="text-ink-soft" aria-hidden="true" />
      <p className="font-serif text-base text-fg">{text.title}</p>
      <p className="max-w-sm text-sm text-ink-soft">{text.body}</p>
      {(filter !== "all" || searching) && (
        <button type="button" className={`${secondaryButton} mt-1`} onClick={onShowAll}>
          Show all rows
        </button>
      )}
    </div>
  );
}

export function RowsErrorState({ error, onRetry }: { error: ImportErrorInfo; onRetry: () => void }) {
  return (
    <div role="alert" className="m-3 rounded-md bg-danger-soft px-3 py-3 text-sm text-danger sm:m-4">
      <p className="font-semibold">{error.message}</p>
      {error.howToFix && <p className="mt-0.5">{error.howToFix}</p>}
      <button type="button" className={`${secondaryButton} mt-2`} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
