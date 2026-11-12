"use client";

import { Ban, Check } from "lucide-react";
import { OPTION_COLOR_KEYS, getOptionColorStyle } from "@/shared/utils/optionColors";

interface OptionColorPickerProps {
  /** Selected palette key, or "" for the default colour. */
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Row of colour swatches for a dropdown option. Every colour is visible at once,
 * so picking one is a single click; the first swatch resets to the default.
 */
export default function OptionColorPicker({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Option colour",
}: OptionColorPickerProps) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        aria-label="Default colour"
        title="Default"
        disabled={disabled}
        onClick={() => onChange("")}
        className={`grid h-6 w-6 place-items-center rounded-full border border-dashed border-ink-soft/50 text-ink-soft outline-none transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-not-allowed disabled:opacity-50 ${
          !value ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
        }`}
      >
        <Ban size={12} />
      </button>

      {OPTION_COLOR_KEYS.map((key) => {
        const style = getOptionColorStyle(key);
        if (!style) return null;
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={style.label}
            title={style.label}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`grid h-6 w-6 place-items-center rounded-full ${style.dot} outline-none transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-not-allowed disabled:opacity-50 ${
              selected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
            }`}
          >
            {selected && <Check size={13} strokeWidth={3} className="text-white" />}
          </button>
        );
      })}
    </div>
  );
}
