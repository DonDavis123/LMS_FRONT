import { formatCount } from "@/features/leadImport/utils/format";

/** The first check: grey blocks where the summary and the rows will be, plus the plain-words progress line. */
export default function ReviewSkeleton({ totalRows }: { totalRows: number }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p role="status" aria-live="polite" className="text-sm text-ink-soft">
        Checking {formatCount(totalRows)} rows against your settings and your existing leads...
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[4.5rem] animate-shimmer rounded-lg" />
        ))}
      </div>
      <div className="h-5 w-2/3 animate-shimmer rounded" />
      <div className="h-24 animate-shimmer rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-10 animate-shimmer rounded-md" />
        ))}
      </div>
    </div>
  );
}
