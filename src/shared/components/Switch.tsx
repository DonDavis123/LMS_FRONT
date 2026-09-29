"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name — required because the visible ON/OFF text is not a label. */
  ariaLabel: string;
  disabled?: boolean;
  /** Shows a request is in flight: the switch is disabled and marked busy. */
  loading?: boolean;
  /** Renders an "ON" / "OFF" caption beside the track. */
  showState?: boolean;
}

/**
 * Sliding on/off switch. A real <button role="switch"> so it is keyboard
 * operable (Space/Enter) and announced correctly by screen readers. The
 * button is 36px tall for touch, while the visible track stays compact.
 */
export default function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
  loading = false,
  showState = false,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-1 outline-none focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-not-allowed disabled:opacity-60 ${
        loading ? "cursor-wait" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 motion-reduce:transition-none ${
          checked ? "bg-success" : "bg-ink-soft/40"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
      {showState && (
        <span aria-hidden="true" className="w-7 text-left text-xs font-semibold text-ink-soft">
          {checked ? "ON" : "OFF"}
        </span>
      )}
    </button>
  );
}
