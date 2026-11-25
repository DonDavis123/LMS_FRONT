"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * Pill-shaped segmented switch used by dashboard widgets (My tasks tabs,
 * Leads-over-time range). Sibling of `Tabs.tsx` - same thumb motion - but
 * built for compact in-card controls that need counts and a busy state.
 *
 *  - A thumb glides behind the active option with a light spring and
 *    "stretches" from its trailing edge while it travels (reuses the
 *    `animate-tab-thumb` keyframes from globals.css).
 *  - Options share one width, so thumb position is pure CSS (no measuring).
 *  - Optional count badge per option; it pops whenever the number changes,
 *    and a "danger" badge shows a soft ping so overdue work feels alive.
 *  - hover tint, press-down scale, keyboard-only focus ring.
 *  - `busy` makes the thumb breathe while data for the selection loads.
 *  - Reduced-motion is handled globally in globals.css.
 *
 * Two semantics:
 *  - mode="tabs"   -> role=tablist/tab, roving tabindex, Arrow/Home/End keys.
 *                     Pair with a tabpanel whose id is `${idPrefix}-panel`
 *                     and which is labelled by `${idPrefix}-tab-${value}`.
 *  - mode="toggle" -> role=group of aria-pressed buttons (e.g. 7d/30d/90d).
 */
export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional count shown in a small pill after the label. */
  badge?: number;
  /** "danger" tints the badge and adds a soft ping while badge > 0. */
  badgeTone?: "neutral" | "danger";
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the whole control. */
  label: string;
  mode?: "tabs" | "toggle";
  /** `md` = 40px touch targets (tabs). `sm` = 40px on mobile, 32px on desktop. */
  size?: "sm" | "md";
  /** Required for mode="tabs": builds the tab / tabpanel ids. */
  idPrefix?: string;
  /** Thumb pulses while the selected option's data is loading. */
  busy?: boolean;
  className?: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  mode = "toggle",
  size = "md",
  idPrefix,
  busy = false,
  className = "",
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  // Derive "which way did the thumb move" during render (same pattern as
  // Tabs.tsx) so the stretch replays on every change, including changes
  // that come from outside the control.
  const [prevIndex, setPrevIndex] = useState(activeIndex);
  const [pulse, setPulse] = useState(0);
  const [movingRight, setMovingRight] = useState(true);
  if (prevIndex !== activeIndex) {
    setMovingRight(activeIndex > prevIndex);
    setPrevIndex(activeIndex);
    setPulse((count) => count + 1);
  }

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isTabs = mode === "tabs";

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isTabs) return;
    const last = options.length - 1;
    const next =
      event.key === "ArrowRight" ? (activeIndex === last ? 0 : activeIndex + 1)
      : event.key === "ArrowLeft" ? (activeIndex === 0 ? last : activeIndex - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(options[next].value);
    buttonRefs.current[next]?.focus();
  }

  const buttonSize = size === "md" ? "min-h-10 px-3 text-sm sm:px-4" : "h-10 px-3.5 text-xs sm:h-8 sm:px-3";

  return (
    <div
      role={isTabs ? "tablist" : "group"}
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={`relative inline-grid max-w-full grid-flow-col auto-cols-fr rounded-full border border-line bg-paper p-1 shadow-[inset_0_1px_2px_rgba(18,33,58,0.07)] ${className}`}
    >
      {/* Sliding thumb: one option wide, moved by whole-width steps. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 left-1 top-1 [transition:transform_460ms_cubic-bezier(0.3,1.15,0.5,1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      >
        {/* Inner shape re-mounts on each change to replay the stretch. */}
        <span
          key={pulse}
          className={`relative block h-full w-full overflow-hidden rounded-full border border-slate bg-slate-light shadow-[0_1px_2px_rgba(18,33,58,0.14),0_6px_12px_-6px_rgba(76,103,133,0.55)] ${
            pulse > 0 ? "animate-tab-thumb" : ""
          } ${busy ? "animate-pulse" : ""}`}
          style={{ transformOrigin: movingRight ? "right center" : "left center" }}
        >
          {/* Soft top sheen gives the thumb a little depth. */}
          <span className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5" />
        </span>
      </span>

      {options.map((option, index) => {
        const isActive = index === activeIndex;
        const hasBadge = typeof option.badge === "number";
        const urgent = option.badgeTone === "danger" && (option.badge ?? 0) > 0;
        const tabProps = isTabs
          ? {
              role: "tab" as const,
              id: idPrefix ? `${idPrefix}-tab-${option.value}` : undefined,
              "aria-selected": isActive,
              "aria-controls": idPrefix ? `${idPrefix}-panel` : undefined,
              tabIndex: isActive ? 0 : -1,
            }
          : { "aria-pressed": isActive };

        return (
          <button
            key={option.value}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            {...tabProps}
            onClick={() => onChange(option.value)}
            className={`group/seg relative z-10 inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium tabular-nums outline-none transition-[color,background-color,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-slate/60 active:scale-[0.94] ${buttonSize} ${
              isActive ? "text-fg" : "text-ink-soft hover:bg-slate/10 hover:text-fg"
            }`}
          >
            {option.label}
            {hasBadge && (
              // key = count, so the pill re-mounts and pops on every change.
              <span
                key={option.badge}
                className={`relative inline-flex h-5 min-w-5 animate-pop-in items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none transition-colors duration-200 ${
                  urgent
                    ? "bg-danger-soft text-[color-mix(in_srgb,var(--color-danger)_65%,var(--color-fg))]"
                    : isActive
                      ? "bg-fg/10 text-fg"
                      : "bg-ink-soft/15 text-ink-soft group-hover/seg:text-fg"
                }`}
              >
                {urgent && (
                  <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
                  </span>
                )}
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
