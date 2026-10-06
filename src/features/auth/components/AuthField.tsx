import type { ComponentProps, CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AuthFieldProps extends Omit<ComponentProps<"input">, "className"> {
  label: string;
  icon: LucideIcon;
  /** Control rendered inside the right edge (e.g. a show/hide button). */
  trailing?: ReactNode;
  /** Marks the field invalid: red border + aria-invalid. */
  invalid?: boolean;
  /** Extra classes for the outer wrapper (spacing, animation delay…). */
  wrapperClassName?: string;
  /** Inline style for the wrapper (e.g. the --i animation stagger). */
  wrapperStyle?: CSSProperties;
}

/**
 * Labelled text input with a leading icon. The icon picks up the amber focus
 * colour through `.lp-login-field:focus-within` (login.css), so there is no
 * focus state to track in React.
 */
export default function AuthField({
  label,
  icon: Icon,
  trailing,
  invalid = false,
  wrapperClassName = "",
  wrapperStyle,
  ...inputProps
}: AuthFieldProps) {
  return (
    <label className={`block ${wrapperClassName}`} style={wrapperStyle}>
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      <span className="lp-login-field relative block">
        <Icon
          size={17}
          aria-hidden="true"
          className="lp-login-field-icon pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
        />
        <input
          {...inputProps}
          aria-invalid={invalid || undefined}
          className={`w-full rounded-xl border bg-surface py-3 pl-10 text-sm text-fg outline-none transition placeholder:text-ink-soft/60 focus:ring-4 ${
            trailing ? "pr-12" : "pr-3.5"
          } ${
            invalid
              ? "border-danger focus:border-danger focus:ring-danger/15"
              : "border-line hover:border-slate/50 focus:border-amber focus:ring-amber/20"
          }`}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">
            {trailing}
          </span>
        )}
      </span>
    </label>
  );
}
