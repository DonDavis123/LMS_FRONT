import type { ArtKind } from "@/features/calendar/config/seasonalThemes";

/**
 * Original corner illustrations for the seasonal calendar. Each style is a
 * small set of simple vector shapes (leaves, petals, hearts, drops …) arranged
 * into one cluster, which is mirrored into all four corners of the calendar.
 * Purely decorative: hidden from assistive technology and ignores the pointer.
 */

type ShapeName = "leaf" | "flower" | "heart" | "drop" | "star" | "snowflake" | "sun" | "berry";

const PALETTES: Record<ArtKind, [string, string, string, string]> = {
  leaf: ["#e2662b", "#c98826", "#a8321f", "#e8a83a"],
  snow: ["#8fb4e8", "#5b6bc4", "#c5d6f5", "#7f94d8"],
  holly: ["#c1342f", "#2f8f5b", "#e8c46a", "#6fb58a"],
  heart: ["#d6456b", "#f08aa4", "#a82a52", "#ffc2d1"],
  blossom: ["#c47fe0", "#f2a6cf", "#8a5fc9", "#8cc9a0"],
  sunflower: ["#e6a817", "#c9821a", "#7aa63a", "#f3cf5a"],
  drop: ["#4aa3c7", "#3f9e5a", "#8cc9de", "#2a8fa5"],
  sun: ["#f2a93b", "#e0583f", "#f6cf6a", "#e98a5b"],
  confetti: ["#e07a1f", "#2f8f5b", "#2a5fa8", "#f2b24a"],
};

/** Which shapes each style uses, in the order they are placed in a cluster. */
const SHAPES: Record<ArtKind, ShapeName[]> = {
  leaf: ["leaf", "leaf", "leaf", "berry", "leaf", "leaf"],
  snow: ["snowflake", "snowflake", "star", "snowflake", "star", "snowflake"],
  holly: ["leaf", "leaf", "berry", "leaf", "berry", "star"],
  heart: ["heart", "heart", "heart", "heart", "star", "heart"],
  blossom: ["flower", "flower", "leaf", "flower", "leaf", "flower"],
  sunflower: ["flower", "leaf", "flower", "leaf", "flower", "leaf"],
  drop: ["drop", "drop", "leaf", "drop", "drop", "leaf"],
  sun: ["sun", "star", "sun", "star", "flower", "star"],
  confetti: ["star", "star", "leaf", "star", "drop", "star"],
};

/** x, y, size, rotation (degrees) inside a 200 x 200 corner. */
const CLUSTER: [number, number, number, number][] = [
  [34, 38, 1.0, -25],
  [82, 22, 0.8, 20],
  [26, 92, 0.85, 35],
  [74, 70, 0.7, -50],
  [128, 30, 0.6, 60],
  [34, 142, 0.6, -10],
];

function polygonStar(): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? 34 : 14;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius).toFixed(1)}`);
  }
  return points.join(" ");
}
const STAR_POINTS = polygonStar();

function Shape({ name, fill, accent }: { name: ShapeName; fill: string; accent: string }) {
  switch (name) {
    case "leaf":
      return (
        <>
          <path d="M0,-46 C34,-30 34,22 0,46 C-34,22 -34,-30 0,-46Z" fill={fill} />
          <path d="M0,-38 L0,44 M0,-8 L-14,-22 M0,10 L14,-4 M0,26 L-12,14" stroke={accent} strokeWidth="2" fill="none" opacity="0.55" strokeLinecap="round" />
        </>
      );
    case "flower":
      return (
        <>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse key={angle} cx="0" cy="-22" rx="13" ry="22" fill={fill} transform={`rotate(${angle})`} />
          ))}
          <circle r="10" fill={accent} />
        </>
      );
    case "heart":
      return <path d="M0,36 C-56,-4 -28,-46 0,-16 C28,-46 56,-4 0,36Z" fill={fill} />;
    case "drop":
      return <path d="M0,-44 C28,-6 34,10 0,40 C-34,10 -28,-6 0,-44Z" fill={fill} />;
    case "star":
      return <polygon points={STAR_POINTS} fill={fill} />;
    case "snowflake":
      return (
        <g stroke={fill} strokeWidth="4" strokeLinecap="round" fill="none">
          {[0, 60, 120].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <line x1="0" y1="-36" x2="0" y2="36" />
              <path d="M-9,-24 L0,-32 L9,-24 M-9,24 L0,32 L9,24" />
            </g>
          ))}
        </g>
      );
    case "sun":
      return (
        <>
          {Array.from({ length: 10 }, (_, i) => (
            <line key={i} x1="0" y1="-34" x2="0" y2="-48" stroke={fill} strokeWidth="6" strokeLinecap="round" transform={`rotate(${i * 36})`} />
          ))}
          <circle r="22" fill={fill} />
        </>
      );
    case "berry":
      return (
        <>
          <circle cx="-8" cy="4" r="12" fill={fill} />
          <circle cx="12" cy="-6" r="10" fill={fill} />
          <circle cx="4" cy="18" r="9" fill={fill} />
          <circle cx="-11" cy="0" r="3" fill="#fff" opacity="0.5" />
        </>
      );
  }
}

function Cluster({ kind }: { kind: ArtKind }) {
  const palette = PALETTES[kind];
  const shapes = SHAPES[kind];
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="presentation">
      {CLUSTER.map(([x, y, size, rotation], index) => (
        <g key={index} transform={`translate(${x} ${y}) rotate(${rotation}) scale(${size})`}>
          <Shape name={shapes[index]} fill={palette[index % 4]} accent={palette[(index + 2) % 4]} />
        </g>
      ))}
    </svg>
  );
}

export default function SeasonalArt({ kind }: { kind: ArtKind }) {
  const corner = "absolute h-28 w-28 opacity-90 dark:opacity-60 sm:h-40 sm:w-40 lg:h-48 lg:w-48";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className={`${corner} left-0 top-0`}>
        <Cluster kind={kind} />
      </div>
      <div className={`${corner} right-0 top-0 -scale-x-100`}>
        <Cluster kind={kind} />
      </div>
      <div className={`${corner} bottom-0 left-0 -scale-y-100`}>
        <Cluster kind={kind} />
      </div>
      <div className={`${corner} bottom-0 right-0 -scale-100`}>
        <Cluster kind={kind} />
      </div>
    </div>
  );
}
