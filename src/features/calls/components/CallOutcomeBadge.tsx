import type { CallOutcome, CallStatus } from "@/features/calls/types/call.types";

const OUTCOME_STYLES: Record<CallOutcome, string> = {
  Connected: "bg-success-soft text-success",
  "Callback Requested": "bg-slate-light text-slate",
  Busy: "bg-amber/15 text-amber-dark",
  Voicemail: "border border-line bg-paper text-ink-soft",
  "Not Attended": "bg-danger-soft text-danger",
  "Wrong Number": "bg-danger-soft text-danger",
};

const DOT_STYLES: Record<CallOutcome, string> = {
  Connected: "bg-success",
  "Callback Requested": "bg-slate",
  Busy: "bg-amber-dark",
  Voicemail: "bg-ink-soft",
  "Not Attended": "bg-danger",
  "Wrong Number": "bg-danger",
};

const STATUS_STYLES: Record<Exclude<CallStatus, "Completed">, { pill: string; dot: string }> = {
  Planned: { pill: "bg-slate-light text-slate", dot: "bg-slate" },
  Missed: { pill: "bg-danger-soft text-danger", dot: "bg-danger" },
};

/**
 * Colour-coded pill for a call, shared by the list, detail and record views.
 * A completed call shows its outcome; a planned / missed call (which has no
 * outcome yet) shows its status instead.
 */
export default function CallOutcomeBadge({
  outcome,
  status,
  className = "",
}: {
  outcome: string | null;
  status?: CallStatus | null;
  className?: string;
}) {
  if (status && status !== "Completed") {
    const style = STATUS_STYLES[status];
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${style.pill} ${className}`}
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        {status}
      </span>
    );
  }

  if (!outcome) return <span className={`text-xs text-ink-soft ${className}`}>—</span>;

  const known = outcome as CallOutcome;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        OUTCOME_STYLES[known] ?? "bg-paper text-ink-soft"
      } ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[known] ?? "bg-ink-soft"}`} />
      {outcome}
    </span>
  );
}
