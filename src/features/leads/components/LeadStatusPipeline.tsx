"use client";

import type { CSSProperties } from "react";
import { Loader2, ThumbsDown } from "lucide-react";
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

/** Beyond this many stages a single overlapping row gets too cramped, so they wrap into a grid. */
const MAX_CHEVRON_ROW = 9;

// Arrow-shaped step: a point on the right, a matching notch on the left.
// The first step keeps a flat left edge.
const NOTCH = "12px";
const STEP_SHAPE = `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%, ${NOTCH} 50%)`;
const FIRST_STEP_SHAPE = `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%)`;

/**
 * Chevron-style lead status bar. Every status is always visible — no
 * horizontal scrolling. On large screens all steps share one row and long
 * names wrap onto two lines; on smaller screens (or with many stages) the
 * steps flow into a grid instead of being cut off.
 *
 * Motion: the arrows slide in left to right, hovering washes colour across an
 * arrow and lifts it, the current stage is filled with a slow light sweep, and
 * a stage you pick gets a colour wipe the moment it becomes current.
 *
 * Purely presentational — LeadDetail owns the API call and passes the result
 * back in via `current` / `pending`.
 */
export default function LeadStatusPipeline({ statuses, current, pending, onSelect }: LeadStatusPipelineProps) {
  // "None" means "no status yet" and was never a stage. A lead whose status
  // was since hidden or removed still sees its own stage, highlighted.
  const stages = statuses.filter((status) => status !== "None");
  if (current && current !== "None" && !stages.includes(current)) stages.push(current);
  const wraps = stages.length > MAX_CHEVRON_ROW;
  const currentIndex = stages.indexOf(current);

  return (
    <ol
      className={`lp-chev-list mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 ${wraps ? "lg:grid-cols-6" : "lg:flex lg:gap-0"}`}
      aria-label="Lead status"
    >
      {stages.map((status, index) => {
        const isCurrent = status === current;
        const isNegative = NEGATIVE_STATUSES.includes(status);
        const isPending = status === pending;
        const isPassed = currentIndex >= 0 && index < currentIndex && !isNegative && !NEGATIVE_STATUSES.includes(current);
        const state = isCurrent ? "current" : isPassed ? "passed" : "upcoming";
        const shape: CSSProperties = { clipPath: index === 0 || wraps ? FIRST_STEP_SHAPE : STEP_SHAPE };

        // Outer layer paints the 1px outline, inner layer the fill.
        const outline = isCurrent
          ? isNegative
            ? "bg-danger"
            : "bg-ink dark:bg-slate"
          : isPassed
            ? "bg-slate/40 group-hover:bg-slate"
            : isNegative
              ? "bg-line group-hover:bg-danger/60"
              : "bg-line group-hover:bg-slate";

        return (
          <li
            key={status}
            data-current={isCurrent}
            data-negative={isCurrent && isNegative}
            className={`lp-chev-item min-w-0 lg:flex-1 ${index === 0 || wraps ? "" : "lg:-ml-2"}`}
          >
            <button
              type="button"
              onClick={() => onSelect(status)}
              aria-current={isCurrent ? "step" : undefined}
              aria-busy={isPending || undefined}
              title={status}
              className={`group block h-12 w-full outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${outline} ${
                isPending ? "animate-stage-pulse" : ""
              }`}
              style={shape}
            >
              <span
                data-state={state}
                data-tone={isCurrent && isNegative ? "danger" : undefined}
                className="lp-chev-fill flex h-[calc(100%-2px)] w-[calc(100%-2px)] translate-x-px translate-y-px items-center justify-center gap-1.5 px-5 text-center text-xs leading-tight"
                style={shape}
              >
                {/* Re-mounts when this stage becomes current, replaying the wipe. */}
                {isCurrent && <span key={`wipe-${status}`} aria-hidden="true" className="lp-chev-wipe" />}
                <span
                  className={`relative z-10 flex items-center justify-center gap-1.5 ${isCurrent ? "font-semibold" : ""} ${
                    isNegative && !isCurrent ? "group-hover:text-danger" : ""
                  }`}
                >
                  {isPending ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  ) : (
                    isNegative && <ThumbsDown size={13} aria-hidden="true" />
                  )}
                  {status}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
