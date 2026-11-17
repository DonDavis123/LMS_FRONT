"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ListChecks, RefreshCw, Sparkles } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import { useLeadSummary } from "@/features/leads/hooks/useLeadSummary";
import { formatDateTime } from "@/shared/utils/formatDate";

interface LeadSummaryCardProps {
  leadId: string;
}

/**
 * "Lead summary" panel at the top of a lead page. Nothing is generated when
 * the page opens: the user clicks "Generate summary" and the backend writes a
 * short briefing from the lead's details, timeline and calls. Render it with
 * `key={lead.id}` so a different lead never shows a previous lead's summary.
 */
export default function LeadSummaryCard({ leadId }: LeadSummaryCardProps) {
  const { summary, loading, error, generate } = useLeadSummary(leadId);
  const [open, setOpen] = useState(true);

  const bodyId = `lead-summary-${leadId}`;

  return (
    <section
      aria-label="Lead summary"
      className="mt-4 rounded-lg border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          <Sparkles size={15} className="text-amber-dark" aria-hidden="true" />
          Lead summary
        </h2>

        <div className="flex items-center gap-2">
          {summary && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls={bodyId}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-ink-soft transition hover:bg-paper hover:text-fg"
            >
              {open ? "Hide" : "Show"}
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          )}
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className={
              summary
                ? "flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper disabled:opacity-60"
                : "flex items-center gap-1.5 rounded-md bg-amber px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98] disabled:opacity-60"
            }
          >
            {loading ? (
              <Spinner size="sm" />
            ) : summary ? (
              <RefreshCw size={14} aria-hidden="true" />
            ) : (
              <Sparkles size={14} aria-hidden="true" />
            )}
            {loading ? "Generating…" : summary ? "Refresh" : "Generate summary"}
          </button>
        </div>
      </div>

      {!summary && !loading && !error && (
        <p className="mt-2 text-sm text-ink-soft">
          Get the story of this lead in a few lines: where it stands, what happened so far and what to do next.
        </p>
      )}

      {loading && !summary && (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-4 w-4/5 animate-shimmer rounded-md" />
          <div className="h-4 w-3/5 animate-shimmer rounded-md" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <div id={bodyId} hidden={!open} className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {open && (
            <>
              <p className="mt-3 text-base font-medium leading-relaxed text-fg">{summary.headline}</p>

              {summary.key_points.length > 0 && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-fg marker:text-ink-soft">
                  {summary.key_points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              )}

              {summary.next_steps.length > 0 && (
                <div className="mt-4 rounded-md bg-paper p-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    <ListChecks size={14} aria-hidden="true" />
                    Next steps
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg marker:text-ink-soft">
                    {summary.next_steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-3 text-xs text-ink-soft">
                Based on {summary.timeline_events_used} timeline{" "}
                {summary.timeline_events_used === 1 ? "event" : "events"} and {summary.calls_used}{" "}
                {summary.calls_used === 1 ? "call" : "calls"} · Generated {formatDateTime(summary.generated_at)} ·
                AI-written, check important details.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
