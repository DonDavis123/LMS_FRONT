"use client";

import { Info } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  /** Small tag next to the label, e.g. "Recommended". */
  badge?: string;
  disabled?: boolean;
  /** Shown instead of the description while the option is disabled. */
  hint?: string;
  /** Extra content inside the card, e.g. a note or a caution. */
  note?: ReactNode;
}

interface OptionRadioGroupProps<T extends string> {
  value: T;
  options: RadioCardOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Tailwind grid classes for the cards. */
  className?: string;
}

/**
 * A group of selectable cards that behaves as one radio group: a single tab
 * stop, arrow keys move and select, Home/End jump, disabled cards are skipped.
 */
export default function OptionRadioGroup<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "grid grid-cols-1 gap-2",
}: OptionRadioGroupProps<T>) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const checkedIndex = options.findIndex((option) => option.value === value);
  const tabStop =
    checkedIndex >= 0 && !options[checkedIndex].disabled ? checkedIndex : options.findIndex((option) => !option.disabled);

  function move(from: number, step: 1 | -1) {
    for (let i = 1; i <= options.length; i += 1) {
      const index = (from + step * i + options.length * 2) % options.length;
      if (!options[index].disabled) {
        onChange(options[index].value);
        refs.current[index]?.focus();
        return;
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index, -1);
        break;
      case "Home":
        event.preventDefault();
        move(-1, 1);
        break;
      case "End":
        event.preventDefault();
        move(options.length, -1);
        break;
      case " ":
      case "Enter":
        event.preventDefault();
        if (!options[index].disabled) onChange(options[index].value);
        break;
    }
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={className}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <div
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => !option.disabled && onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex gap-3 rounded-lg border p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-amber ${
              option.disabled
                ? "cursor-not-allowed border-line bg-paper opacity-70"
                : checked
                  ? "cursor-pointer border-slate bg-surface ring-1 ring-slate"
                  : "cursor-pointer border-line bg-surface hover:bg-paper"
            }`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                checked ? "border-slate" : "border-ink-soft/60"
              }`}
            >
              {checked && <span className="h-2 w-2 rounded-full bg-slate" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-fg">{option.label}</span>
                {option.badge && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                    {option.badge}
                  </span>
                )}
              </span>
              {option.disabled && option.hint ? (
                <span className="mt-1 flex items-start gap-1.5 text-xs text-ink-soft">
                  <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {option.hint}
                </span>
              ) : (
                option.description && <span className="mt-0.5 block text-xs text-ink-soft">{option.description}</span>
              )}
              {option.note && <span className="mt-2 block">{option.note}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
