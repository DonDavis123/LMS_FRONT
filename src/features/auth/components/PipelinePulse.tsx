import type { CSSProperties } from "react";

/**
 * The login hero: a heartbeat line climbing through the lead pipeline.
 * The line draws itself, each stage lights up as it is reached, then a single
 * "lead" keeps travelling the route. Stage names mirror real lead statuses.
 *
 * Pure SVG + CSS (see styles/login.css) — no client JS, so it renders on the
 * server and costs nothing at hydration.
 */

// One continuous route. Each blip is a heartbeat; each curve is a stage step.
const ROUTE =
  "M0 176 H26 l6 -18 l9 34 l6 -22 l4 6 H80 " +
  "C108 176 108 144 136 144 H146 l6 -18 l9 34 l6 -22 l4 6 H190 " +
  "C218 144 218 112 246 112 H256 l6 -18 l9 34 l6 -22 l4 6 H300 " +
  "C328 112 328 76 356 76 H366 l6 -18 l9 34 l6 -22 l4 6 H410 H480";

const STAGES = [
  { label: "Not contacted", x: 80, y: 176 },
  { label: "Contacted", x: 190, y: 144 },
  { label: "Pre-qualified", x: 300, y: 112 },
  { label: "Converted", x: 410, y: 76 },
] as const;

const stagger = (i: number): CSSProperties => ({ ["--i" as string]: i });

export default function PipelinePulse({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 220"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Faint track so the full route is readable before the pulse arrives. */}
      <path
        d={ROUTE}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* The pulse drawing itself. */}
      <path
        d={ROUTE}
        pathLength={1000}
        className="lp-login-trace"
        stroke="var(--color-amber)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* A lead travelling the pipeline. */}
      <path
        d={ROUTE}
        pathLength={1000}
        className="lp-login-lead"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {STAGES.map((stage, i) => {
        const isLast = i === STAGES.length - 1;
        return (
          <g key={stage.label}>
            <g className="lp-login-node" style={stagger(i)}>
              <circle
                className="lp-login-node-ring"
                style={stagger(i)}
                cx={stage.x}
                cy={stage.y}
                r="6"
                stroke="var(--color-amber)"
                strokeWidth="1.5"
              />
              <circle
                cx={stage.x}
                cy={stage.y}
                r="6.5"
                fill={isLast ? "var(--color-amber)" : "var(--color-ink)"}
                stroke={isLast ? "var(--color-amber)" : "rgba(255,255,255,0.75)"}
                strokeWidth="2"
              />
            </g>
            <text
              className="lp-login-label"
              style={stagger(i)}
              x={stage.x}
              y={stage.y + 28}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight="600"
              fill={isLast ? "var(--color-amber)" : "rgba(255,255,255,0.6)"}
            >
              {stage.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
