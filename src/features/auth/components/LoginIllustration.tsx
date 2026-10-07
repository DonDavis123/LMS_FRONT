"use client";

import { useRef, type CSSProperties } from "react";
import { useHeroMotion } from "@/features/auth/hooks/useHeroMotion";
import "@/features/auth/styles/login-illustration.css";

/**
 * Sign-in hero: an isometric "data analyst" scene — a figure on a platform
 * pointing at floating dashboard panels, with three floating cubes.
 *
 * Pure SVG + CSS (see styles/login-illustration.css). The only client code is
 * the existing `useHeroMotion` hook, which pauses every loop while the tab is
 * hidden or the panel is off-screen. Nothing here touches auth state or the
 * API — it is presentation only.
 *
 * Motion (one 7s cycle, all loops share it so they stay in step):
 *  - bars grow, hold, then reset            - checklist ticks off row by row
 *  - ring charts draw themselves            - clock colon blinks
 *  - the figure taps SET, the button presses - cubes and panels drift
 *  - a light wave travels over the platform grid
 */

const GRID = 6;
const CX = 260;
const TOP = 330;
const HALF_W = 190;
const HALF_H = 95;

/** Isometric projection of a platform coordinate (0..GRID). */
const iso = (u: number, v: number): [number, number] => [
  CX + ((u - v) / GRID) * HALF_W,
  TOP + ((u + v) / GRID) * HALF_H,
];

const diamond = (inset = 0) => {
  const a = inset;
  const b = GRID - inset;
  return [iso(a, a), iso(b, a), iso(b, b), iso(a, b)]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
};

const TILES = Array.from({ length: GRID * GRID }, (_, n) => {
  const i = n % GRID;
  const j = Math.floor(n / GRID);
  const g = 0.07;
  const pts = [
    iso(i + g, j + g),
    iso(i + 1 - g, j + g),
    iso(i + 1 - g, j + 1 - g),
    iso(i + g, j + 1 - g),
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return { i, j, pts };
});

const k = (n: number): CSSProperties => ({ ["--k" as string]: n });
const idx = (n: number, extra: Record<string, string | number> = {}): CSSProperties => ({
  ["--i" as string]: n,
  ...extra,
});

interface CubeProps {
  x: number;
  y: number;
  top: string;
  left: string;
  right: string;
  enter: number;
  drift: number;
}

function Cube({ x, y, top, left, right, enter, drift }: CubeProps) {
  return (
    <g className="lp-ill-enter" style={k(enter)}>
      <g className="lp-ill-float" style={{ ["--d" as string]: drift }}>
        <g transform={`translate(${x} ${y})`}>
          <rect x="-11" y="30" width="22" height="64" fill="url(#lpi-stem)" />
          <path d="M-26,-15 L0,0 L0,34 L-26,19 Z" fill={left} />
          <path d="M26,-15 L0,0 L0,34 L26,19 Z" fill={right} />
          <path d="M0,-30 L26,-15 L0,0 L-26,-15 Z" fill={top} />
        </g>
      </g>
    </g>
  );
}

export default function LoginIllustration({ className = "" }: { className?: string }) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<HTMLDivElement | null>(null);
  useHeroMotion(heroRef, tiltRef, false);

  return (
    <div ref={heroRef} className={`lp-ill ${className}`} data-paused="false" aria-hidden="true">
      <svg
        className="lp-ill-svg"
        viewBox="0 0 520 560"
        fill="none"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lpi-slab" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F4F2FF" />
            <stop offset="1" stopColor="#CFC6F7" />
          </linearGradient>
          <linearGradient id="lpi-slab-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#E4DFFB" />
            <stop offset="1" stopColor="#B7A9F2" />
          </linearGradient>
          <linearGradient id="lpi-slab-under" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F1EFFF" />
            <stop offset="1" stopColor="#DAD3FA" />
          </linearGradient>
          <linearGradient id="lpi-leg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3BB4F5" />
            <stop offset="1" stopColor="#5CD0FA" />
          </linearGradient>
          <linearGradient id="lpi-jacket" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6049E4" />
            <stop offset="1" stopColor="#3524A6" />
          </linearGradient>
          <linearGradient id="lpi-hair" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E85BF5" />
            <stop offset="1" stopColor="#A22BC4" />
          </linearGradient>
          <linearGradient id="lpi-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#C026D3" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="lpi-arc-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22D3EE" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="lpi-arc-b" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F0ABFC" />
            <stop offset="1" stopColor="#C026D3" />
          </linearGradient>
          <linearGradient id="lpi-set" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2CF0B4" />
            <stop offset="1" stopColor="#10CC93" />
          </linearGradient>
          <linearGradient id="lpi-stem" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#CFC6F7" stopOpacity="0.55" />
            <stop offset="1" stopColor="#CFC6F7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── Platform ─────────────────────────────────────────────── */}
        <g className="lp-ill-enter" style={k(0)}>
          <g transform="translate(0 26)">
            <polygon points={diamond()} fill="url(#lpi-slab-under)" />
            <path d={`M70,425 L260,520 L260,534 L70,439 Z`} fill="#D6CEF8" />
            <path d={`M450,425 L260,520 L260,534 L450,439 Z`} fill="#C4B8F4" />
          </g>
          <path d="M70,425 L260,520 L260,538 L70,443 Z" fill="url(#lpi-slab-side)" />
          <path d="M450,425 L260,520 L260,538 L450,443 Z" fill="#B3A5F0" />
          <polygon points={diamond()} fill="url(#lpi-slab)" />
          {TILES.map(({ i, j, pts }) => (
            <polygon
              key={`${i}-${j}`}
              className="lp-ill-tile"
              style={{ ["--u" as string]: i, ["--v" as string]: j }}
              points={pts}
              fill="#FFFFFF"
              stroke="#CFC8F5"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* ── Left wall: bar chart, checklist, dots ─────────────────── */}
        <g className="lp-ill-enter" style={k(3)}>
          <g className="lp-ill-float lp-ill-float--slow" style={{ ["--d" as string]: 1.4 }}>
            <g transform="translate(76 150) skewY(-21)">
              <rect width="104" height="92" rx="7" fill="#EEF0FD" stroke="#DCDDF8" />
              <rect x="14" y="12" width="26" height="3.5" rx="1.75" fill="#D2D5F3" />
              <circle cx="84" cy="13.5" r="2.5" fill="#22D3EE" />
              <circle cx="92" cy="13.5" r="2.5" fill="#C026D3" />
              {[28, 40, 52, 64, 46].map((h, n) => (
                <rect
                  key={n}
                  className="lp-ill-bar"
                  style={idx(n)}
                  x={14 + n * 17.5}
                  y={80 - h}
                  width="10"
                  height={h}
                  rx="2"
                  fill="url(#lpi-bar)"
                />
              ))}

              <rect y="102" width="74" height="100" rx="7" fill="#EEF0FD" stroke="#DCDDF8" />
              {[0, 1, 2, 3, 4].map((n) => {
                const y = 114 + n * 15;
                return (
                  <g key={n}>
                    <rect x="10" y={y} width="9" height="9" rx="2" stroke="#C3C7EE" strokeWidth="1.2" />
                    <rect x="25" y={y + 3} width={n % 2 ? 30 : 38} height="3.5" rx="1.75" fill="#D2D5F3" />
                    <path
                      className="lp-ill-check"
                      style={idx(n)}
                      pathLength={14}
                      d={`M11.8,${y + 4.6} l2.4,2.4 l4,-4.6`}
                      stroke="#C026D3"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
              <rect x="10" y="190" width="30" height="5" rx="2.5" fill="#E879F9" />

              <rect x="80" y="104" width="40" height="20" rx="6" fill="#EEF0FD" stroke="#DCDDF8" />
              {[92, 100, 108].map((cx, n) => (
                <circle key={cx} className="lp-ill-blink" style={idx(n)} cx={cx} cy="114" r="2.8" fill="#A5B4FC" />
              ))}
            </g>
          </g>
        </g>

        {/* ── Right wall: rings, clock, SET ─────────────────────────── */}
        <g className="lp-ill-enter" style={k(4)}>
          <g className="lp-ill-float lp-ill-float--slow" style={{ ["--d" as string]: 0 }}>
            <g transform="translate(268 66) skewY(22)">
              <rect width="112" height="84" rx="7" fill="#EEF0FD" stroke="#DCDDF8" />
              {[
                { cx: 32, grad: "a", to: 28 },
                { cx: 78, grad: "b", to: 42 },
              ].map(({ cx, grad, to }, n) => (
                <g key={cx} transform={`rotate(-90 ${cx} 28)`}>
                  <circle cx={cx} cy="28" r="15" stroke="#DADDF6" strokeWidth="5" />
                  <circle
                    className="lp-ill-arc"
                    style={idx(n, { ["--to" as string]: to })}
                    cx={cx}
                    cy="28"
                    r="15"
                    pathLength={100}
                    strokeDashoffset={to}
                    stroke={`url(#lpi-arc-${grad})`}
                    strokeWidth="5"
                  />
                </g>
              ))}
              {[58, 66, 74].map((y) => (
                <g key={y}>
                  <circle cx="14" cy={y} r="2" fill="#C3C7EE" />
                  <rect x="22" y={y - 1.5} width="26" height="3" rx="1.5" fill="#D2D5F3" />
                  <rect x="64" y={y - 1.5} width="34" height="3" rx="1.5" fill="#D2D5F3" />
                </g>
              ))}

              <rect y="94" width="102" height="44" rx="7" fill="#EEF0FD" stroke="#DCDDF8" />
              <text
                x="12"
                y="125"
                fontSize="23"
                fontWeight="700"
                letterSpacing="2"
                fill="#C5C9F2"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              >
                08<tspan className="lp-ill-colon">:</tspan>15
              </text>

              <rect x="122" y="8" width="28" height="98" rx="7" fill="#EEF0FD" stroke="#DCDDF8" />
              {[
                { cy: 28, c: "#10D9A0" },
                { cy: 57, c: "#22D3EE" },
                { cy: 86, c: "#D946EF" },
              ].map(({ cy, c }, n) => (
                <g key={cy}>
                  <circle cx="136" cy={cy} r="8" stroke="#DADDF6" strokeWidth="3" />
                  <circle
                    className="lp-ill-arc"
                    style={idx(n + 2, { ["--to" as string]: 0 })}
                    cx="136"
                    cy={cy}
                    r="8"
                    pathLength={100}
                    strokeDashoffset={0}
                    stroke={c}
                    strokeWidth="3"
                    transform={`rotate(-90 136 ${cy})`}
                  />
                </g>
              ))}

              <g className="lp-ill-set">
                <rect className="lp-ill-set-glow" x="36" y="146" width="58" height="28" rx="8" fill="#2CF0B4" />
                <rect x="38" y="152" width="54" height="24" rx="6" fill="#0BB985" />
                <g className="lp-ill-set-face">
                  <rect x="38" y="146" width="54" height="24" rx="6" fill="url(#lpi-set)" />
                  <text
                    x="65"
                    y="163"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    letterSpacing="1.2"
                    fill="#FFFFFF"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    SET
                  </text>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* ── Figure ────────────────────────────────────────────────── */}
        <g className="lp-ill-enter" style={k(2)}>
          <ellipse cx="232" cy="452" rx="50" ry="17" fill="#8E7CE8" opacity="0.32" />
          <g className="lp-ill-breathe">
            {/* legs + shoes */}
            <path d="M198,318 L228,318 L224,436 L203,436 Z" fill="url(#lpi-leg)" />
            <path d="M226,318 L255,316 L247,426 L226,432 Z" fill="#27A9F0" />
            <path d="M200,434 L226,434 L231,449 Q214,455 197,449 Z" fill="#3B2A9B" />
            <path d="M224,429 L248,423 L257,438 Q240,447 223,440 Z" fill="#33258A" />

            {/* left arm, hand on hip */}
            <path
              d="M189,220 Q164,246 176,282 Q184,300 201,306"
              stroke="#4631C4"
              strokeWidth="18"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="203" cy="308" r="7.5" fill="#F7A99C" />

            {/* torso */}
            <path d="M184,212 Q222,198 262,208 L266,322 Q224,332 186,326 Z" fill="url(#lpi-jacket)" />
            <path d="M225,205 L227,327" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1.5" />

            {/* neck + head */}
            <path d="M221,188 L242,188 L242,207 L221,207 Z" fill="#E8948A" />
            <ellipse cx="233" cy="174" rx="21" ry="23" fill="#F7A99C" />
            <path
              d="M211,174 Q208,146 233,144 Q259,146 255,174 Q253,187 245,191 Q233,183 221,191 Q213,185 211,174 Z"
              fill="url(#lpi-hair)"
            />
            <ellipse cx="253" cy="178" rx="4" ry="6" fill="#F19187" />

            {/* right arm, pointing at the panel */}
            <g className="lp-ill-arm">
              <path
                d="M258,220 L288,246 L312,205"
                stroke="#5039D6"
                strokeWidth="17"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="315" cy="198" r="7.5" fill="#F7A99C" />
              <path d="M318,194 L329,185" stroke="#F7A99C" strokeWidth="4" strokeLinecap="round" />
            </g>
          </g>
        </g>

        {/* ── Cubes ─────────────────────────────────────────────────── */}
        <Cube x={38} y={250} top="#56C4F8" left="#E6F5FE" right="#2B8CF0" enter={5} drift={0} />
        <Cube x={452} y={158} top="#34D9A5" left="#E4FBF2" right="#12B886" enter={6} drift={1.1} />
        <Cube x={466} y={318} top="#EC6BF8" left="#F8E4FB" right="#C026D3" enter={7} drift={2.2} />
      </svg>
    </div>
  );
}
