import type { CSSProperties } from "react";

/**
 * The sign-in hero: a small pipeline board. Lead cards slide stage by stage
 * from "Not contacted" to "Converted", pausing in each column, and turn amber
 * once converted. Stage names mirror real lead statuses.
 *
 * Pure markup + CSS (see the "PipelineFlow" block in styles/login.css): no
 * client JS, so it renders on the server. Every measurement uses container
 * query units (cqw) of `.lp-flow`, so the board scales with whatever width
 * the brand panel has — from a small laptop to an ultra-wide monitor.
 */

const STAGES = ["Not contacted", "Contacted", "Pre-qualified", "Converted"] as const;
const LANES = [0, 1, 2] as const;

const stagger = (i: number): CSSProperties => ({ ["--i" as string]: i });

export default function PipelineFlow({ className = "" }: { className?: string }) {
  return (
    <div className={`lp-flow ${className}`} aria-hidden="true">
      <div className="lp-flow-head lp-login-rise" style={stagger(0)}>
        {STAGES.map((label, i) => (
          <span key={label} data-last={i === STAGES.length - 1}>
            {label}
          </span>
        ))}
      </div>

      <div className="lp-flow-lanes">
        {LANES.map((lane) => (
          <div
            key={lane}
            className="lp-flow-lane lp-login-rise"
            style={stagger(lane + 1)}
            data-lane={lane}
          >
            <span className="lp-flow-chip" style={{ ["--lane" as string]: lane }}>
              <span className="lp-flow-chip-dot" />
              <span className="lp-flow-chip-line" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
