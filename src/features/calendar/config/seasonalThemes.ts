/**
 * Seasonal calendar themes — one per month.
 *
 * The calendar follows the month being viewed, so browsing December shows the
 * Christmas theme and browsing back to October shows Halloween. A theme only
 * adds an accent colour, decoration emoji, a banner and festival markers: it
 * never recolours the event chips, whose colours mean task / meeting / call /
 * reminder.
 *
 * To add or change a theme, edit this file only. `accent` is used both as a
 * solid colour (with white text) and, mixed with transparency, as a tint, so
 * pick a mid-dark colour that reads in light and dark mode.
 *
 * FESTIVALS lists only fixed-date days. Festivals whose date moves every year
 * (Diwali, Holi, Eid …) are deliberately left out so nothing is ever shown on
 * the wrong day.
 */

/** Illustration style drawn in the corners of the calendar. */
export type ArtKind = "leaf" | "wheat" | "pumpkin" | "snow" | "holly" | "heart" | "blossom" | "sunflower" | "drop" | "sun" | "confetti";

export interface SeasonalTheme {
  /** 0 = January … 11 = December. */
  month: number;
  name: string;
  tagline: string;
  /** Main colour: month title, today marker, selected-day tint, grid-line tint. */
  accent: string;
  /** Second colour: the year next to the title. */
  accent2: string;
  /** Light-mode "paper" tint of the calendar card. */
  paper: string;
  /** Emoji used for the month's decoration. */
  icon: string;
  /** Big emoji shown beside the title. */
  mascot: string;
  /** Corner illustration style. */
  art: ArtKind;
}

export const SEASONAL_THEMES: readonly SeasonalTheme[] = [
  { month: 0, name: "New Year", tagline: "Fresh start, fresh pipeline.", accent: "#5b6bc4", accent2: "#c9821a", paper: "#f1f4fc", icon: "🎆", mascot: "⛄", art: "snow" },
  { month: 1, name: "Hearts", tagline: "Show your customers some love.", accent: "#d6456b", accent2: "#7a3d8f", paper: "#fff1f4", icon: "💖", mascot: "💌", art: "heart" },
  { month: 2, name: "Spring Bloom", tagline: "New leads are blossoming.", accent: "#8a5fc9", accent2: "#2f8f5b", paper: "#f7f1fd", icon: "🌸", mascot: "🦋", art: "blossom" },
  { month: 3, name: "April Showers", tagline: "Showers today, deals tomorrow.", accent: "#2f8f9f", accent2: "#d6456b", paper: "#eef8f6", icon: "🌦️", mascot: "☔", art: "drop" },
  { month: 4, name: "May Flowers", tagline: "Sunshine on every follow-up.", accent: "#b9830f", accent2: "#2f8f5b", paper: "#fff8e0", icon: "🌻", mascot: "🐝", art: "sunflower" },
  { month: 5, name: "Summer Sun", tagline: "Hot leads, cool calls.", accent: "#e0583f", accent2: "#1f7fb5", paper: "#fff1ea", icon: "☀️", mascot: "🏖️", art: "sun" },
  { month: 6, name: "Monsoon", tagline: "Let the closings pour in.", accent: "#2a7f95", accent2: "#3f9e5a", paper: "#eaf5f7", icon: "🌧️", mascot: "🐸", art: "drop" },
  { month: 7, name: "Freedom Month", tagline: "Celebrate the wins, big and small.", accent: "#e07a1f", accent2: "#2f8f5b", paper: "#fff4e6", icon: "🇮🇳", mascot: "🪁", art: "confetti" },
  { month: 8, name: "Harvest", tagline: "Time to reap what you sowed.", accent: "#9a7414", accent2: "#7a3d2f", paper: "#fbf6dc", icon: "🌾", mascot: "🌾", art: "wheat" },
  { month: 9, name: "Halloween", tagline: "No tricks — just treats and closed deals.", accent: "#d9540f", accent2: "#5b3a8f", paper: "#f3eefa", icon: "🎃", mascot: "🎃", art: "pumpkin" },
  { month: 10, name: "Autumn Glow", tagline: "Cosy days, warm follow-ups.", accent: "#b8501f", accent2: "#5b3a6f", paper: "#fff7e8", icon: "🍂", mascot: "🐿️", art: "leaf" },
  { month: 11, name: "Christmas", tagline: "Wrap up the year with a bow.", accent: "#c1342f", accent2: "#2f7f4b", paper: "#fff2f0", icon: "🎄", mascot: "🎅", art: "holly" },
] as const;

export interface Festival {
  emoji: string;
  label: string;
}

/** Fixed-date festivals and observances, keyed "MM-DD". */
export const FESTIVALS: Readonly<Record<string, Festival>> = {
  "01-01": { emoji: "🎆", label: "New Year's Day" },
  "01-14": { emoji: "🪁", label: "Makar Sankranti / Pongal" },
  "01-26": { emoji: "🇮🇳", label: "Republic Day" },
  "02-14": { emoji: "💖", label: "Valentine's Day" },
  "03-08": { emoji: "👩", label: "International Women's Day" },
  "04-01": { emoji: "🤡", label: "April Fools' Day" },
  "04-14": { emoji: "🌾", label: "Vaisakhi / Tamil New Year" },
  "04-22": { emoji: "🌍", label: "Earth Day" },
  "05-01": { emoji: "🛠️", label: "Labour Day" },
  "06-05": { emoji: "🌳", label: "World Environment Day" },
  "06-21": { emoji: "🧘", label: "International Yoga Day" },
  "08-15": { emoji: "🇮🇳", label: "Independence Day" },
  "09-05": { emoji: "🍎", label: "Teachers' Day" },
  "10-02": { emoji: "🕊️", label: "Gandhi Jayanti" },
  "10-31": { emoji: "🎃", label: "Halloween" },
  "11-01": { emoji: "🌟", label: "Kerala Piravi / Karnataka Rajyotsava" },
  "11-14": { emoji: "🧒", label: "Children's Day" },
  "12-24": { emoji: "🎅", label: "Christmas Eve" },
  "12-25": { emoji: "🎄", label: "Christmas Day" },
  "12-31": { emoji: "🥂", label: "New Year's Eve" },
};

export function getThemeForMonth(month: number): SeasonalTheme {
  return SEASONAL_THEMES[((month % 12) + 12) % 12];
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function getFestival(date: Date): Festival | null {
  return FESTIVALS[`${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`] ?? null;
}

/**
 * CSS custom properties that carry the theme into Tailwind classes such as
 * `bg-[var(--cal-paper)] dark:bg-[var(--cal-paper-dk)]`. Everything is derived
 * from the two accent colours, so a theme only needs `accent` and `accent2`.
 */
export function themeCssVars(theme: SeasonalTheme): Record<string, string> {
  return {
    "--cal-accent": theme.accent,
    "--cal-accent2": theme.accent2,
    // Warm "paper" in light mode, a tinted charcoal in dark mode.
    "--cal-paper": `color-mix(in srgb, ${theme.accent} 5%, ${theme.paper})`,
    "--cal-paper-dk": `color-mix(in srgb, ${theme.accent} 10%, #14161c)`,
    // Semi-transparent so the corner illustrations show through the grid edges.
    "--cal-cell": `color-mix(in srgb, color-mix(in srgb, ${theme.accent} 3%, #fffdf5) 60%, transparent)`,
    "--cal-cell-dk": `color-mix(in srgb, color-mix(in srgb, ${theme.accent} 6%, #1a1d26) 60%, transparent)`,
    "--cal-line": `color-mix(in srgb, ${theme.accent} 28%, #b9b49e)`,
    "--cal-line-dk": `color-mix(in srgb, ${theme.accent} 30%, #2b2f3a)`,
    "--cal-title-dk": `color-mix(in srgb, ${theme.accent} 70%, white)`,
    "--cal-select": `color-mix(in srgb, ${theme.accent} 14%, transparent)`,
  };
}
