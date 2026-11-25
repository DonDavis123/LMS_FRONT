"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ThumbsDown } from "lucide-react";
import { useCountUp } from "@/shared/hooks/useCountUp";
import type { LeadStatus } from "@/features/leads/types/lead.types";
import "@/features/leads/styles/lead-pipeline.css";

interface LeadStatusPipelineProps {
  /** The company's active Lead Status options, in their configured order. */
  statuses: readonly LeadStatus[];
  current: LeadStatus;
  /** Status currently being saved, if any (shows a spinner and a pulse). */
  pending: LeadStatus | null;
  onSelect: (status: LeadStatus) => void;
}

/** Stages that mean the lead is a dead end — marked with a thumbs-down. */
const NEGATIVE_STATUSES: readonly LeadStatus[] = ["Junk Lead", "Not Qualified"];

/** Column count per screen size; keeps long lists to two tidy rows. */
function gridColumns(count: number): string {
  if (count <= 3) return "lg:grid-cols-3";
  if (count <= 4) return "lg:grid-cols-4";
  if (count <= 5) return "lg:grid-cols-5";
  return "lg:grid-cols-4 xl:grid-cols-6";
}

/**
 * Lead status card: a progress rail that fills up to the current stage, and a
 * grid of stage chips below it. Stages before the current one read as "passed",
 * the current one is filled and glows, and the rest wait quietly until hovered.
 * Dead-end stages (Junk Lead / Not Qualified) switch the rail to red.
 *
 * Purely presentational — LeadDetail owns the API call and passes the result
 * back in via `current` / `pending`, so the props are unchanged.
 */
export default function LeadStatusPipeline({ statuses, current, pending, onSelect }: LeadStatusPipelineProps) {
  // "None" means "no status yet" and was never a stage. A lead whose status
  // was since hidden or removed still sees its own stage, highlighted.
  const stages = statuses.filter((status) => status !== "None");
  if (current && current !== "None" && !stages.includes(current)) stages.push(current);

  const currentIndex = stages.indexOf(current);
  const currentNegative = NEGATIVE_STATUSES.includes(current);
  const percent = currentIndex >= 0 && stages.length > 0 ? Math.round(((currentIndex + 1) / stages.length) * 100) : 0;

  // The rail starts empty and grows on the first frame, so it fills on load.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const shownWidth = armed ? percent : 0;
  const countedPercent = useCountUp(percent, 900);

  return (
    <section aria-label="Lead status" className="mt-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      {/* Header: what the card is, and where this lead stands */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
          <span aria-hidden="true" className="lp-bar h-4 w-1 shrink-0 rounded-full bg-amber" />
          Lead status
        </h3>

        {currentIndex >= 0 && (
          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <span key={current} className="lp-fade-up tabular-nums">
              {currentNegative ? "Closed out" : `Stage ${currentIndex + 1} of ${stages.length}`}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${
                currentNegative ? "border-danger/30 bg-danger-soft text-danger" : "border-line bg-paper text-fg"
              }`}
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                    currentNegative ? "bg-danger" : "bg-amber"
                  }`}
                />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${currentNegative ? "bg-danger" : "bg-amber"}`} />
              </span>
              <span key={current} className="lp-fade-up">
                {current}
              </span>
              {!currentNegative && <span className="font-medium tabular-nums text-ink-soft">{countedPercent}%</span>}
            </span>
          </div>
        )}
      </div>

      {/* Progress rail */}
      <div className="relative mt-3.5 h-1.5" role="presentation">
        <div className="absolute inset-0 overflow-hidden rounded-full bg-line">
          <div
            className="lp-pipe-fill absolute inset-y-0 left-0 overflow-hidden rounded-full"
            data-tone={currentNegative ? "danger" : "amber"}
            style={{ width: `${shownWidth}%` }}
          >
            <span className="lp-pipe-shine" aria-hidden="true" />
          </div>
        </div>
        {percent > 0 && (
          <span
            aria-hidden="true"
            className="lp-pipe-knob absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${shownWidth}%` }}
          >
            <span
              className={`lp-pipe-knob-ping absolute inset-0 rounded-full ${currentNegative ? "bg-danger" : "bg-amber"}`}
            />
            <span
              className={`absolute inset-0 rounded-full border-2 bg-surface shadow ${
                currentNegative ? "border-danger" : "border-amber"
              }`}
            />
          </span>
        )}
      </div>

      {/* Stage chips */}
      <ol className={`lp-pipe-list mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 ${gridColumns(stages.length)}`}>
        {stages.map((status, index) => {
          const isCurrent = status === current;
          const isNegative = NEGATIVE_STATUSES.includes(status);
          const isPending = status === pending;
          const isPassed = currentIndex >= 0 && index < currentIndex && !isNegative && !currentNegative;

          const tone = isCurrent
            ? isNegative
              ? "border-danger bg-danger text-white font-semibold shadow-[0_8px_20px_-8px_rgba(193,70,47,0.7)]"
              : "border-ink bg-ink text-white font-semibold shadow-[0_8px_20px_-8px_rgba(18,33,58,0.65)] dark:border-slate dark:ring-1 dark:ring-white/20"
            : isPassed
              ? "border-amber/40 bg-amber/10 text-fg hover:border-amber hover:bg-amber/15"
              : isNegative
                ? "border-line bg-surface text-ink-soft hover:border-danger/50 hover:bg-danger-soft hover:text-danger"
                : "border-line bg-surface text-ink-soft hover:-translate-y-0.5 hover:border-slate/60 hover:bg-paper hover:text-fg hover:shadow-md";

          const badge = isCurrent
            ? "bg-white/20 text-white"
            : isPassed
              ? "bg-amber text-ink"
              : "bg-paper text-ink-soft ring-1 ring-inset ring-line group-hover:bg-slate-light";

          return (
            <li key={status} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(status)}
                aria-current={isCurrent ? "step" : undefined}
                aria-busy={isPending || undefined}
                title={status}
                className={`group relative flex h-11 w-full items-center gap-2.5 rounded-xl border px-2.5 text-left text-[13px] leading-tight outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-slate/60 active:scale-[0.97] ${tone} ${
                  isPending ? "animate-stage-pulse" : ""
                }`}
              >
                {isCurrent && (
                  <>
                    {/* Halo, one-off burst and light sweep — all decorative. */}
                    <span
                      aria-hidden="true"
                      className={`lp-chip-ring pointer-events-none absolute -inset-0.5 rounded-[14px] border-2 ${
                        isNegative ? "border-danger/70" : "border-amber/80"
                      }`}
                    />
                    <span
                      key={`burst-${status}`}
                      aria-hidden="true"
                      className={`lp-chip-burst pointer-events-none absolute inset-0 rounded-xl ${
                        isNegative ? "bg-danger/40" : "bg-amber/50"
                      }`}
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                      <span className="lp-chip-shine" />
                    </span>
                  </>
                )}

                <span
                  className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums transition-colors duration-200 ${badge}`}
                >
                  {isPending ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  ) : isCurrent ? (
                    <span key={`mark-${status}`} className="lp-badge-pop grid place-items-center">
                      {isNegative ? <ThumbsDown size={12} aria-hidden="true" /> : <Check size={13} strokeWidth={3} aria-hidden="true" />}
                    </span>
                  ) : isPassed ? (
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  ) : isNegative ? (
                    <ThumbsDown size={12} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>

                <span className="relative min-w-0 flex-1 truncate">{status}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
