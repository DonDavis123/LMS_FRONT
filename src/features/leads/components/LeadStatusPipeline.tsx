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

// Arrow-shaped step: a point on the right, a matching notch on the left, with
// every corner softly rounded. The first step keeps a flat (rounded) left edge.
const NOTCH = 12;
const OUTER_HEIGHT = 48; // h-12
const INNER_HEIGHT = OUTER_HEIGHT - 2; // the fill layer is inset by 1px all round

/** A point measured from the left edge (`l`) or the right edge (`r`, so x <= 0 is inside). */
interface ShapePoint {
  a: "l" | "r";
  x: number;
  y: number;
  /** Corner radius in px. */
  radius: number;
}

function cssX(point: { a: "l" | "r"; x: number }): string {
  if (point.a === "l") return `${point.x.toFixed(2)}px`;
  return point.x === 0 ? "100%" : `calc(100% - ${(-point.x).toFixed(2)}px)`;
}

/**
 * Builds a `clip-path: polygon()` for an arrow whose corners are rounded.
 * Widths are fluid, so points are anchored to the left or right edge; rounding
 * is done by replacing each corner with a few points along a curve.
 */
function roundedArrow(height: number, withNotch: boolean): string {
  const mid = height / 2;
  const points: ShapePoint[] = [
    { a: "l", x: 0, y: 0, radius: 7 },
    { a: "r", x: -NOTCH, y: 0, radius: 6 },
    { a: "r", x: 0, y: mid, radius: 4.5 },
    { a: "r", x: -NOTCH, y: height, radius: 6 },
    { a: "l", x: 0, y: height, radius: 7 },
  ];
  if (withNotch) points.push({ a: "l", x: NOTCH, y: mid, radius: 4.5 });

  // Unit direction from one corner towards another. Edges between a left-
  // and a right-anchored point are always horizontal.
  const direction = (from: ShapePoint, to: ShapePoint): [number, number] => {
    if (from.a !== to.a) return [to.a === "r" ? 1 : -1, 0];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    return [dx / length, dy / length];
  };

  const out: string[] = [];
  const STEPS = 5;
  points.forEach((corner, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const [px, py] = direction(corner, previous);
    const [nx, ny] = direction(corner, next);
    const r = corner.radius;
    const start = { x: corner.x + px * r, y: corner.y + py * r };
    const end = { x: corner.x + nx * r, y: corner.y + ny * r };
    for (let i = 0; i <= STEPS; i += 1) {
      const t = i / STEPS;
      const u = 1 - t;
      // Quadratic curve through the corner gives a smooth round-off.
      const x = u * u * start.x + 2 * u * t * corner.x + t * t * end.x;
      const y = u * u * start.y + 2 * u * t * corner.y + t * t * end.y;
      out.push(`${cssX({ a: corner.a, x })} ${y.toFixed(2)}px`);
    }
  });
  return `polygon(${out.join(", ")})`;
}

const STEP_OUTER = roundedArrow(OUTER_HEIGHT, true);
const FIRST_STEP_OUTER = roundedArrow(OUTER_HEIGHT, false);
const STEP_INNER = roundedArrow(INNER_HEIGHT, true);
const FIRST_STEP_INNER = roundedArrow(INNER_HEIGHT, false);

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
        const isFlat = index === 0 || wraps;
        const outerShape: CSSProperties = { clipPath: isFlat ? FIRST_STEP_OUTER : STEP_OUTER };
        const innerShape: CSSProperties = { clipPath: isFlat ? FIRST_STEP_INNER : STEP_INNER };

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
              style={outerShape}
            >
              <span
                data-state={state}
                data-tone={isCurrent && isNegative ? "danger" : undefined}
                className="lp-chev-fill flex h-[calc(100%-2px)] w-[calc(100%-2px)] translate-x-px translate-y-px items-center justify-center gap-1.5 pl-6 pr-7 text-center text-[12.5px] font-medium leading-tight tracking-[0.01em]"
                style={innerShape}
              >
                {/* Re-mounts when this stage becomes current, replaying the wipe. */}
                {isCurrent && <span key={`wipe-${status}`} aria-hidden="true" className="lp-chev-wipe" />}
                <span
                  className={`relative z-10 flex min-w-0 items-center justify-center gap-1.5 ${isCurrent ? "font-semibold tracking-[0.015em]" : ""} ${
                    isNegative && !isCurrent ? "group-hover:text-danger" : ""
                  }`}
                >
                  {isPending ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  ) : (
                    isNegative && <ThumbsDown size={13} aria-hidden="true" />
                  )}
                  <span className="line-clamp-2 min-w-0">{status}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
