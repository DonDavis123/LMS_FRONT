import { Activity } from "lucide-react";

interface BrandMarkProps {
  /** Wordmark colour — pass a class so it works on both navy and paper. */
  textClassName?: string;
  className?: string;
}

/**
 * LeadPulse logo: an amber tile with a pulse glyph that gives a soft
 * heartbeat glow, followed by the wordmark.
 */
export default function BrandMark({
  textClassName = "text-fg",
  className = "",
}: BrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="lp-login-mark flex h-9 w-9 items-center justify-center rounded-xl bg-amber text-ink">
        <Activity size={19} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className={`font-serif text-xl tracking-tight ${textClassName}`}>
        LeadPulse
      </span>
    </span>
  );
}
