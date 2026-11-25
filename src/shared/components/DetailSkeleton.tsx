interface DetailSkeletonProps {
  /** Round avatar next to the title (Lead / Contact / User). */
  avatar?: boolean;
  /** How many action buttons sit on the right of the header. */
  actions?: number;
  /** The AI summary strip under the header (Lead / Contact / Account). */
  summary?: boolean;
  /** The Overview / Timeline tab switch. */
  tabs?: boolean;
  /** The lead-status chevron bar. */
  pipeline?: boolean;
  /** Number of field cards. */
  cards?: number;
  /** Field boxes per card. */
  fields?: number;
  className?: string;
}

const bar = "animate-shimmer rounded-md";

/**
 * Loading placeholder that has the same shape as a record-detail page, so the
 * real content settles into the spots the skeleton was holding instead of the
 * whole page jumping. Use it inside `DetailLoader`.
 */
export default function DetailSkeleton({
  avatar = true,
  actions = 4,
  summary = false,
  tabs = true,
  pipeline = false,
  cards = 1,
  fields = 6,
  className = "max-w-5xl",
}: DetailSkeletonProps) {
  return (
    <div className={`lp-skel mx-auto ${className}`} role="status" aria-busy="true" aria-label="Loading">
      <div>
        <div className={`h-4 w-28 ${bar}`} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatar && <div className="h-11 w-11 shrink-0 animate-shimmer rounded-full" />}
          <div className="space-y-2">
            <div className={`h-6 w-48 sm:w-64 ${bar}`} />
            <div className={`h-3.5 w-28 ${bar}`} />
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {Array.from({ length: actions }).map((_, i) => (
            <div key={i} className={`h-9 ${i === actions - 1 ? "w-9" : "w-20"} animate-shimmer rounded-md`} />
          ))}
        </div>
      </div>

      {summary && (
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <div className="h-8 w-8 shrink-0 animate-shimmer rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className={`h-3.5 w-28 ${bar}`} />
              <div className={`h-3 w-56 max-w-full ${bar}`} />
            </div>
            <div className="h-8 w-20 animate-shimmer rounded-lg" />
          </div>
        </div>
      )}

      {tabs && (
        <div className="mt-6">
          <div className="h-10 w-64 animate-shimmer rounded-full" />
        </div>
      )}

      {pipeline && (
        <div className="mt-4">
          <div className="h-[172px] w-full animate-shimmer rounded-xl" />
        </div>
      )}

      {Array.from({ length: cards }).map((_, card) => (
        <div key={card} className="mt-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2.5 sm:mb-5">
            <div className="h-4 w-1 rounded-full bg-amber/60" />
            <div className={`h-3 w-24 ${bar}`} />
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-5">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i}>
                <div className={`mb-2 h-3 w-20 ${bar}`} />
                <div className="h-[42px] animate-shimmer rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
