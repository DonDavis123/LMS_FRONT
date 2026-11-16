import type { ArtKind } from "@/features/calendar/config/seasonalThemes";

/**
 * Original corner illustrations for the seasonal calendar. Each style is a
 * small set of simple vector shapes (leaves, petals, hearts, drops …) arranged
 * into one cluster, which is mirrored into all four corners of the calendar.
 * Purely decorative: hidden from assistive technology and ignores the pointer.
 */

type ShapeName =
  | "leaf" | "flower" | "heart" | "drop" | "star" | "snowflake" | "sun" | "berry"
  | "wheat" | "apple" | "pumpkin" | "bat" | "moon" | "mushroom" | "acorn";

const PALETTES: Record<ArtKind, [string, string, string, string]> = {
  leaf: ["#e2662b", "#b8501f", "#a8321f", "#e8a83a"],
  wheat: ["#d9a521", "#b5791c", "#c1342f", "#7aa63a"],
  pumpkin: ["#e8731a", "#5b3a8f", "#2b2233", "#f2b632"],
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
  leaf: ["leaf", "mushroom", "leaf", "acorn", "berry", "leaf"],
  wheat: ["wheat", "apple", "wheat", "leaf", "wheat", "apple"],
  pumpkin: ["pumpkin", "bat", "moon", "pumpkin", "bat", "star"],
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
    case "wheat":
      return (
        <>
          <path d="M0,48 C2,20 -2,-10 0,-40" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
          {[-30, -16, -2, 12].map((y, i) => (
            <g key={y}>
              <ellipse cx="-9" cy={y} rx="6" ry="11" fill={fill} transform={`rotate(-30 -9 ${y})`} />
              <ellipse cx="9" cy={y - (i % 2 ? 0 : 3)} rx="6" ry="11" fill={fill} transform={`rotate(30 9 ${y})`} />
            </g>
          ))}
          <ellipse cx="0" cy="-42" rx="5" ry="10" fill={fill} />
        </>
      );
    case "apple":
      return (
        <>
          <path d="M0,-26 C34,-42 46,2 24,30 C12,44 4,36 0,36 C-4,36 -12,44 -24,30 C-46,2 -34,-42 0,-26Z" fill={fill} />
          <path d="M0,-26 C0,-38 4,-44 10,-48" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M4,-38 C16,-50 28,-44 28,-44 C26,-32 12,-32 4,-38Z" fill="#7aa63a" />
        </>
      );
    case "pumpkin":
      return (
        <>
          <ellipse cx="-20" cy="4" rx="22" ry="32" fill={fill} />
          <ellipse cx="20" cy="4" rx="22" ry="32" fill={fill} />
          <ellipse cx="0" cy="4" rx="18" ry="35" fill={fill} stroke={accent} strokeOpacity="0.25" strokeWidth="2" />
          <path d="M-3,-30 C-2,-42 4,-46 10,-50 L14,-44 C8,-42 6,-36 6,-30Z" fill="#5f8a2f" />
          <path d="M-14,0 L-6,-8 L-6,4Z M6,-8 L14,0 L6,4Z M-12,16 Q0,26 12,16" fill="#2b2233" stroke="#2b2233" strokeWidth="3" strokeLinejoin="round" />
        </>
      );
    case "bat":
      return (
        <path
          d="M0,-8 C6,-8 8,-18 12,-18 C14,-12 16,-10 22,-10 C34,-18 46,-12 50,2 C42,-2 36,0 34,8 C28,2 22,4 18,12 C14,6 8,8 0,22 C-8,8 -14,6 -18,12 C-22,4 -28,2 -34,8 C-36,0 -42,-2 -50,2 C-46,-12 -34,-18 -22,-10 C-16,-10 -14,-12 -12,-18 C-8,-18 -6,-8 0,-8Z"
          fill={fill}
        />
      );
    case "moon":
      return <path d="M8,-40 A42,42 0 1 0 8,40 A52,52 0 0 1 8,-40Z" fill={fill} />;
    case "mushroom":
      return (
        <>
          <path d="M-12,4 L-10,36 C-8,42 8,42 10,36 L12,4Z" fill="#f0dcb4" />
          <path d="M-42,6 C-42,-30 -14,-44 0,-44 C14,-44 42,-30 42,6 C28,12 -28,12 -42,6Z" fill={fill} />
          <circle cx="-16" cy="-18" r="5" fill="#fff" opacity="0.6" />
          <circle cx="10" cy="-26" r="4" fill="#fff" opacity="0.6" />
          <circle cx="22" cy="-8" r="4" fill="#fff" opacity="0.6" />
        </>
      );
    case "acorn":
      return (
        <>
          <path d="M-20,-4 C-20,28 20,28 20,-4Z" fill="#c98826" />
          <path d="M-26,-4 C-26,-26 26,-26 26,-4Z" fill={accent} />
          <path d="M0,-24 L0,-36" stroke={accent} strokeWidth="4" strokeLinecap="round" />
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

/** Some shapes are drawn large; shrink them so clusters do not pile up. */
const SHAPE_SCALE: Partial<Record<ShapeName, number>> = {
  pumpkin: 0.7,
  mushroom: 0.75,
  apple: 0.8,
  wheat: 0.85,
  bat: 0.8,
  moon: 0.8,
};

function Cluster({ kind }: { kind: ArtKind }) {
  const palette = PALETTES[kind];
  const shapes = SHAPES[kind];
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="presentation">
      {CLUSTER.map(([x, y, size, rotation], index) => (
        <g key={index} transform={`translate(${x} ${y}) rotate(${rotation}) scale(${size * (SHAPE_SCALE[shapes[index]] ?? 1)})`}>
          <Shape name={shapes[index]} fill={palette[index % 4]} accent={palette[(index + 2) % 4]} />
        </g>
      ))}
    </svg>
  );
}

export default function SeasonalArt({ kind }: { kind: ArtKind }) {
  const corner = "absolute h-16 w-16 opacity-90 dark:opacity-60 sm:h-24 sm:w-24 lg:h-28 lg:w-28";
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
