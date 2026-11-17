import { Loader2 } from "lucide-react";
import type { TranscriptStatus } from "@/features/calls/types/callTranscript.types";

const STYLES: Record<Exclude<TranscriptStatus, "NOT_REQUESTED">, { label: string; pill: string; dot: string }> = {
  PENDING: { label: "Queued", pill: "bg-slate-light text-slate", dot: "bg-slate" },
  PROCESSING: { label: "Transcribing", pill: "bg-amber/15 text-amber-dark", dot: "bg-amber-dark" },
  COMPLETED: { label: "Ready", pill: "bg-success-soft text-success", dot: "bg-success" },
  FAILED: { label: "Failed", pill: "bg-danger-soft text-danger", dot: "bg-danger" },
};

/** Status pill of a recording's transcript, same shape as `CallOutcomeBadge`. */
export default function TranscriptStatusBadge({ status }: { status: TranscriptStatus }) {
  if (status === "NOT_REQUESTED") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft">
        Not transcribed
      </span>
    );
  }

  const style = STYLES[status];
  const busy = status === "PENDING" || status === "PROCESSING";

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${style.pill}`}
    >
      {busy ? (
        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      )}
      {style.label}
    </span>
  );
}
