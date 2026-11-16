import type { SeasonalTheme } from "@/features/calendar/config/seasonalThemes";

interface SeasonalHeaderProps {
  theme: SeasonalTheme;
  /** Month name in month view, otherwise the full view title ("Nov 15 – Nov 21, 2026"). */
  heading: string;
  /** Shown beside the heading in month view. */
  year?: number;
}

/**
 * Large themed title: the month in the accent colour, the year in the second
 * colour, a mascot and the month's tagline. It is the page's h1 while a theme
 * is on.
 */
export default function SeasonalHeader({ theme, heading, year }: SeasonalHeaderProps) {
  return (
    <div className="relative z-10 mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1 sm:px-6">
      <div className="min-w-0">
        <h1
          aria-live="polite"
          className="flex flex-wrap items-baseline gap-x-4 font-serif leading-none tracking-tight text-[var(--cal-accent)] dark:text-[var(--cal-title-dk)]"
        >
          <span className="text-5xl sm:text-6xl lg:text-7xl">{heading}</span>
          {year !== undefined && <span className="text-3xl text-[var(--cal-accent2)] sm:text-4xl lg:text-5xl">{year}</span>}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          <span aria-hidden="true">{theme.icon}</span> {theme.name} · {theme.tagline}
        </p>
      </div>
      <span aria-hidden="true" className="select-none text-6xl leading-none sm:text-7xl lg:text-8xl">
        {theme.mascot}
      </span>
    </div>
  );
}
