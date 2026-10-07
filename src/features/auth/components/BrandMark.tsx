interface BrandMarkProps {
  /** Wordmark colour — pass a class so it works on both navy and paper. */
  textClassName?: string;
  className?: string;
}

/**
 * LeadPulse logo: an amber tile holding three rising bars (a lead moving up
 * the pipeline), followed by the wordmark.
 *
 * Motion (see login.css, "BrandMark"): the bars grow in one after another,
 * then a soft light sweeps across the tile every few seconds. Sizes are fixed rem
 * values, so the mark is identical on every screen.
 */
export default function BrandMark({
  textClassName = "text-fg",
  className = "",
}: BrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="lp-logo flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber text-ink">
        <svg
          viewBox="0 0 24 24"
          className="h-[22px] w-[22px]"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <rect className="lp-logo-bar" style={{ ["--b" as string]: 0 }} x="3.5" y="13" width="4.6" height="7.5" rx="1.4" opacity="0.5" />
          <rect className="lp-logo-bar" style={{ ["--b" as string]: 1 }} x="9.7" y="8.5" width="4.6" height="12" rx="1.4" opacity="0.75" />
          <rect className="lp-logo-bar" style={{ ["--b" as string]: 2 }} x="15.9" y="3.5" width="4.6" height="17" rx="1.4" />
        </svg>
      </span>
      <span className={`font-serif text-xl tracking-tight ${textClassName}`}>
        LeadPulse
      </span>
    </span>
  );
}
