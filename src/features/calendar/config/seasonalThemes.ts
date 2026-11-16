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

export interface SeasonalTheme {
  /** 0 = January … 11 = December. */
  month: number;
  name: string;
  tagline: string;
  accent: string;
  /** Emoji used in the banner and as the month's decoration. */
  icon: string;
  /** Extra emoji repeated across the banner. */
  decor: readonly string[];
}

export const SEASONAL_THEMES: readonly SeasonalTheme[] = [
  { month: 0, name: "New Year", tagline: "Fresh start, fresh pipeline.", accent: "#5b6bc4", icon: "🎆", decor: ["❄️", "✨", "🥂"] },
  { month: 1, name: "Hearts", tagline: "Show your customers some love.", accent: "#d6456b", icon: "💖", decor: ["🌹", "💌", "💕"] },
  { month: 2, name: "Spring Bloom", tagline: "New leads are blossoming.", accent: "#8a5fc9", icon: "🌸", decor: ["🌷", "🦋", "🌼"] },
  { month: 3, name: "April Showers", tagline: "Showers today, deals tomorrow.", accent: "#3f9e5a", icon: "🌦️", decor: ["☔", "🌱", "🌈"] },
  { month: 4, name: "May Flowers", tagline: "Sunshine on every follow-up.", accent: "#b9830f", icon: "🌻", decor: ["🐝", "🌼", "🌿"] },
  { month: 5, name: "Summer Sun", tagline: "Hot leads, cool calls.", accent: "#e0583f", icon: "☀️", decor: ["🏖️", "🍉", "😎"] },
  { month: 6, name: "Monsoon", tagline: "Let the closings pour in.", accent: "#2a8fa5", icon: "🌧️", decor: ["☔", "🍃", "🌩️"] },
  { month: 7, name: "Freedom Month", tagline: "Celebrate the wins, big and small.", accent: "#2f8f5b", icon: "🇮🇳", decor: ["🪁", "🎉", "🏵️"] },
  { month: 8, name: "Harvest", tagline: "Time to reap what you sowed.", accent: "#b5651d", icon: "🍁", decor: ["🌾", "🍂", "📚"] },
  { month: 9, name: "Halloween", tagline: "No tricks — just treats and closed deals.", accent: "#d9640f", icon: "🎃", decor: ["👻", "🦇", "🕸️"] },
  { month: 10, name: "Festive Glow", tagline: "Light up the quarter.", accent: "#8c3a5a", icon: "🪔", decor: ["🍂", "✨", "🎇"] },
  { month: 11, name: "Christmas", tagline: "Wrap up the year with a bow.", accent: "#c1342f", icon: "🎄", decor: ["⛄", "🎁", "❄️"] },
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
