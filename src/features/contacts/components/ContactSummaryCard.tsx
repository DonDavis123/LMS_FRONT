"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import CreateFollowUpMenu from "@/shared/components/CreateFollowUpMenu";
import type { RelatedToValue } from "@/shared/components/RelatedToPicker";
import { useContactSummary } from "@/features/contacts/hooks/useContactSummary";
import { formatDateTime } from "@/shared/utils/formatDate";

interface ContactSummaryCardProps {
  contactId: string;
  /** Shown on tasks / reminders / meetings created from the summary. */
  contactName?: string | null;
  /** Lets the meeting form say who would be emailed. */
  contactEmail?: string | null;
  /** The contact's account, kept on tasks created from the summary. */
  accountId?: string | null;
  accountName?: string | null;
  /** Hide the "create task / reminder / meeting" buttons. */
  allowFollowUps?: boolean;
}

/**
 * "Contact summary" panel at the top of a contact page. The backend stores the
 * latest summary, so opening the page shows it straight away without a model
 * request. "Generate" writes the first one; "Refresh" writes a new one that
 * permanently replaces the saved summary. Render it with `key={contact.id}` so a
 * different contact never shows a previous contact's summary.
 *
 * Every key point and next step has a "+" that creates a task, reminder or
 * meeting for this contact, pre-filled from that line.
 *
 * Layout is deliberately compact: a single slim header row, and once a
 * summary exists the key points and next steps sit side by side on wider
 * screens instead of stacking.
 */
export default function ContactSummaryCard({
  contactId,
  contactName = null,
  contactEmail = null,
  accountId = null,
  accountName = null,
  allowFollowUps = true,
}: ContactSummaryCardProps) {
  const { summary, loading, loadingStored, error, generate } = useContactSummary(contactId);
  const [open, setOpen] = useState(true);
  const related = useMemo<RelatedToValue>(
    () => ({
      personType: "contact",
      personId: contactId,
      personLabel: contactName || contactEmail || "Contact",
      accountId: accountId || "",
      accountLabel: accountName || "",
    }),
    [contactId, contactName, contactEmail, accountId, accountName],
  );

  const bodyId = `contact-summary-${contactId}`;
  const expanded = Boolean(summary) && open;

  return (
    <section
      aria-label="Contact summary"
      className="mt-3 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(18,33,58,0.04)]"
    >
      {/* Header row — the only thing visible until a summary exists */}
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-light text-slate"
        >
          <Sparkles size={15} />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight text-fg">Contact summary</h2>
          <p className="truncate text-xs leading-snug text-ink-soft">
            {summary
              ? `Updated ${formatDateTime(summary.generated_at)}`
              : loading
                ? "Reading the contact's history…"
                : loadingStored
                  ? "Loading the saved summary…"
                  : "A quick briefing: where this contact stands and what to do next."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {summary && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls={bodyId}
              aria-label={open ? "Collapse summary" : "Expand summary"}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition hover:bg-paper hover:text-fg"
            >
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </button>
          )}

          {summary ? (
            <button
              type="button"
              onClick={() => void generate()}
              disabled={loading}
              title="Write a new summary. It replaces the saved one."
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-fg transition hover:bg-paper disabled:opacity-60"
            >
              {loading ? <Spinner size="sm" /> : <RefreshCw size={13} aria-hidden="true" />}
              {loading ? "Updating…" : "Refresh"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void generate()}
              disabled={loading || loadingStored}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60 dark:ring-1 dark:ring-white/15"
            >
              {loading ? <Spinner size="sm" /> : <Sparkles size={13} aria-hidden="true" />}
              {loading ? "Generating…" : "Generate"}
            </button>
          )}
        </div>
      </div>

      {(loading || loadingStored) && !summary && (
        <div className="space-y-2 border-t border-line px-3.5 py-3" aria-hidden="true">
          <div className="h-3.5 w-4/5 animate-shimmer rounded-md" />
          <div className="h-3.5 w-3/5 animate-shimmer rounded-md" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 border-t border-danger/20 bg-danger-soft px-3.5 py-2 text-xs text-danger"
        >
          <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="shrink-0 font-semibold underline underline-offset-2 disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      )}

      {summary && (
        <div
          id={bodyId}
          hidden={!expanded}
          className={`border-t border-line transition-opacity ${loading ? "opacity-60" : ""}`}
        >
          {expanded && (
            <div className="px-3.5 py-3">
              <p className="text-sm font-medium leading-relaxed text-fg">{summary.headline}</p>

              {(summary.key_points.length > 0 || summary.next_steps.length > 0) && (
                <div
                  className={`mt-3 grid gap-x-6 gap-y-3 ${
                    summary.key_points.length > 0 && summary.next_steps.length > 0 ? "md:grid-cols-2" : ""
                  }`}
                >
                  {summary.key_points.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                        Key points
                      </h3>
                      <ul className="mt-1.5 space-y-1.5">
                        {summary.key_points.map((point, index) => (
                          <li key={index} className="flex items-start gap-2 text-[13px] leading-snug text-fg">
                            <span
                              aria-hidden="true"
                              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate/70"
                            />
                            <span className="min-w-0 flex-1">{point}</span>
                            {allowFollowUps && (
                              <CreateFollowUpMenu
                                text={point}
                                source="contact summary"
                                related={related}
                                relatedEmail={contactEmail}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.next_steps.length > 0 && (
                    <div className="rounded-lg bg-paper px-3 py-2.5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                        Next steps
                      </h3>
                      <ol className="mt-1.5 space-y-1.5">
                        {summary.next_steps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2 text-[13px] leading-snug text-fg">
                            <span
                              aria-hidden="true"
                              className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-semibold text-white dark:ring-1 dark:ring-white/20"
                            >
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">{step}</span>
                            {allowFollowUps && (
                              <CreateFollowUpMenu
                                text={step}
                                source="contact summary"
                                related={related}
                                relatedEmail={contactEmail}
                              />
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              <p className="mt-2.5 text-[11px] leading-snug text-ink-soft">
                Based on {summary.timeline_events_used} timeline{" "}
                {summary.timeline_events_used === 1 ? "event" : "events"} and {summary.calls_used}{" "}
                {summary.calls_used === 1 ? "call" : "calls"} · AI-written, check important details.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
