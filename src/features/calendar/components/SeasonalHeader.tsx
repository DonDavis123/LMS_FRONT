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
    <div className="relative z-10 mb-3 flex items-end justify-between gap-x-4 px-2 pt-2 sm:px-8">
      <div className="min-w-0">
        <h1
          aria-live="polite"
          className="flex flex-wrap items-baseline gap-x-4 font-serif leading-none tracking-tight text-[var(--cal-accent)] dark:text-[var(--cal-title-dk)]"
        >
          <span className="text-4xl sm:text-5xl lg:text-6xl">{heading}</span>
          {year !== undefined && <span className="text-2xl text-[var(--cal-accent2)] sm:text-3xl lg:text-4xl">{year}</span>}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          <span aria-hidden="true">{theme.icon}</span> {theme.name} · {theme.tagline}
        </p>
      </div>
      <span aria-hidden="true" className="mr-4 select-none text-4xl leading-none sm:mr-10 sm:text-5xl lg:text-6xl">
        {theme.mascot}
      </span>
    </div>
  );
}
