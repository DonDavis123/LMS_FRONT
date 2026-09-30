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
const NOTCH = "10px";
const STEP_SHAPE = `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%, ${NOTCH} 50%)`;
const FIRST_STEP_SHAPE = `polygon(0 0, calc(100% - ${NOTCH}) 0, 100% 50%, calc(100% - ${NOTCH}) 100%, 0 100%)`;

/**
 * Chevron-style lead status bar. Every status is always visible — no
 * horizontal scrolling. On large screens all steps share one row and long
 * names wrap onto two lines; on smaller screens the steps flow into a
 * 4-column (tablet) or 2-column (phone) grid instead of being cut off.
 * Purely presentational — LeadDetail owns
 * the API call and passes the result back in via `current` / `pending`.
 */
export default function LeadStatusPipeline({ current, pending, onSelect }: LeadStatusPipelineProps) {
  return (
    <ol className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:flex lg:gap-0" aria-label="Lead status">
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
          <li key={status} className={`min-w-0 lg:flex-1 ${index === 0 ? "" : "lg:-ml-2"}`}>
            <button
              type="button"
              onClick={() => onSelect(status)}
              aria-current={isCurrent ? "step" : undefined}
              className={`group block h-12 w-full transition-transform ${outline} ${
                status === pending ? "animate-stage-pulse" : ""
              }`}
              style={shape}
            >
              <span
                className={`flex h-[calc(100%-2px)] w-[calc(100%-2px)] translate-x-px translate-y-px items-center justify-center gap-1.5 px-4 text-center text-xs leading-tight transition-colors ${fill}`}
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
