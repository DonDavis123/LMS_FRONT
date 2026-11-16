import type { SeasonalTheme } from "@/features/calendar/config/seasonalThemes";

interface SeasonalBannerProps {
  theme: SeasonalTheme;
}

/**
 * Decorative strip shown above the calendar toolbar while a seasonal theme is
 * on. Purely cosmetic, so it is hidden from assistive technology.
 */
export default function SeasonalBanner({ theme }: SeasonalBannerProps) {
  return (
    <div
      aria-hidden="true"
      className="mb-3 flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 text-sm"
      style={{
        borderColor: `color-mix(in srgb, ${theme.accent} 45%, transparent)`,
        background: `linear-gradient(90deg, color-mix(in srgb, ${theme.accent} 18%, transparent), color-mix(in srgb, ${theme.accent} 4%, transparent))`,
      }}
    >
      <span className="text-xl leading-none">{theme.icon}</span>
      <span className="min-w-0 truncate">
        <span className="font-semibold text-fg">{theme.name}</span>
        <span className="text-ink-soft"> · {theme.tagline}</span>
      </span>
      <span className="ml-auto hidden shrink-0 gap-1.5 text-lg leading-none sm:flex">
        {theme.decor.map((emoji) => (
          <span key={emoji}>{emoji}</span>
        ))}
      </span>
    </div>
  );
}
