"use client";

import type { CSSProperties } from "react";
import { Check, ThumbsDown } from "lucide-react";
import { LEAD_STATUS_PIPELINE, type LeadStatus } from "@/features/leads/types/lead.types";

interface LeadStatusPipelineProps {
  current: LeadStatus;
  /** Status currently being saved, if any (shows a pulse). */
  pending: LeadStatus | null;
  onSelect: (status: LeadStatus) => void;
}

/** Stages that mean the lead is a dead end — marked with a thumbs-down. */
const NEGATIVE_STATUSES: readonly LeadStatus[] = ["Junk Lead", "Not Qualified"];

// Arrow-shaped step: a point on the right, a matching notch on the left.
// The first step keeps a flat left edge.
const NOTCH = "12px";
const STEP_SHAPE = `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%, ${NOTCH} 50%)`;
const FIRST_STEP_SHAPE = `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%)`;

/**
 * Chevron-style lead status bar. Purely presentational — LeadDetail owns
 * the API call and passes the result back in via `current` / `pending`.
 */
export default function LeadStatusPipeline({ current, pending, onSelect }: LeadStatusPipelineProps) {
  return (
    <ol className="mt-4 flex overflow-x-auto pb-1" aria-label="Lead status">
      {LEAD_STATUS_PIPELINE.map((status, index) => {
        const isCurrent = status === current;
        const isNegative = NEGATIVE_STATUSES.includes(status);
        const shape: CSSProperties = { clipPath: index === 0 ? FIRST_STEP_SHAPE : STEP_SHAPE };

        // Outer layer paints the 1px outline, inner layer the fill.
        const outline = isCurrent ? (isNegative ? "bg-danger" : "bg-slate") : "bg-line group-hover:bg-slate";
        const fill = isCurrent
          ? isNegative
            ? "bg-danger-soft text-danger font-semibold"
            : "bg-slate-light text-fg font-semibold"
          : "bg-surface text-ink-soft group-hover:bg-paper group-hover:text-fg";

        return (
          <li key={status} className={`min-w-[9.5rem] flex-1 ${index === 0 ? "" : "-ml-2"}`}>
            <button
              type="button"
              onClick={() => onSelect(status)}
              aria-current={isCurrent ? "step" : undefined}
              className={`group block h-11 w-full transition-transform ${outline} ${
                status === pending ? "animate-stage-pulse" : ""
              }`}
              style={shape}
            >
              <span
                className={`flex h-[calc(100%-2px)] w-[calc(100%-2px)] translate-x-px translate-y-px items-center justify-center gap-1.5 whitespace-nowrap px-5 text-xs transition-colors ${fill}`}
                style={shape}
              >
                {isNegative && <ThumbsDown size={13} aria-hidden="true" />}
                {status}
                {isCurrent && !isNegative && <Check size={13} aria-hidden="true" />}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
