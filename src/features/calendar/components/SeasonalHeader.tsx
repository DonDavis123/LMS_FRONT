import type { SeasonalTheme } from "@/features/calendar/config/seasonalThemes";

interface SeasonalHeaderProps {
  theme: SeasonalTheme;
  /** Month name in month view, otherwise the full view title ("Nov 15 – Nov 21, 2026"). */
  heading: string;
  /** Shown beside the heading in month view. */
  year?: number;
}

/**
 * Compact themed title: the month in the accent colour, the year in the second
 * colour and the tagline on the same line, with a mascot at the right. It is
 * the page's h1 while a theme is on. The side padding keeps it clear of the
 * corner illustrations.
 */
export default function SeasonalHeader({ theme, heading, year }: SeasonalHeaderProps) {
  return (
    <div className="relative z-10 mb-2 flex items-center justify-between gap-x-3 px-1 sm:px-[4.5rem]">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5">
        <h1
          aria-live="polite"
          className="flex items-baseline gap-x-3 font-serif leading-none tracking-tight text-[var(--cal-accent)] dark:text-[var(--cal-title-dk)]"
        >
          <span className="text-3xl sm:text-4xl lg:text-5xl">{heading}</span>
          {year !== undefined && <span className="text-xl text-[var(--cal-accent2)] sm:text-2xl lg:text-3xl">{year}</span>}
        </h1>
        <p className="truncate text-sm text-ink-soft">
          <span aria-hidden="true">{theme.icon}</span> {theme.name} · {theme.tagline}
        </p>
      </div>
      <span aria-hidden="true" className="select-none text-3xl leading-none sm:text-4xl lg:text-5xl">
        {theme.mascot}
      </span>
    </div>
  );
}
