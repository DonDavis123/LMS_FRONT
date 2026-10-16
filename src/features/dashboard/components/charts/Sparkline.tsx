import { useId } from "react";
import { buildLinePath, type Point } from "@/features/dashboard/utils/dashboardMetrics";

interface SparklineProps {
  values: number[];
  /** Any CSS colour, typically a `var(--color-…)` token. */
  color: string;
  className?: string;
}

const WIDTH = 100;
const HEIGHT = 32;
const PADDING = 3;

/**
 * Tiny trend line. The SVG is stretched to its box (`preserveAspectRatio="none"`)
 * and the stroke is `non-scaling`, so the line keeps its thickness at any size.
 * One point or all zeros has no trend to show, so a flat dashed baseline is drawn.
 */
export default function Sparkline({ values, color, className = "" }: SparklineProps) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const hasTrend = values.length > 1 && values.some((value) => value > 0);
  const max = Math.max(1, ...values);

  const points: Point[] = values.map((value, index) => ({
    x: (index / Math.max(1, values.length - 1)) * WIDTH,
    y: PADDING + (1 - value / max) * (HEIGHT - PADDING * 2),
  }));
  const line = buildLinePath(points);
  const area = hasTrend ? `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z` : "";

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
      className={`block h-8 w-full overflow-visible ${className}`}
    >
      {hasTrend ? (
        <g className="lp-reveal-x">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${color} 28%, transparent)` }} />
              <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${color} 0%, transparent)` }} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} stroke="none" />
          <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </g>
      ) : (
        <line
          x1={0}
          x2={WIDTH}
          y1={HEIGHT - PADDING}
          y2={HEIGHT - PADDING}
          stroke={color}
          strokeOpacity={0.45}
          strokeWidth={1.5}
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
