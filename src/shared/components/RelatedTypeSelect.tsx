"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import CurtainPanel from "@/shared/components/CurtainPanel";

interface RelatedTypeSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly (readonly [T, string])[];
}

/**
 * "Related To" type chooser (None / Lead / Contact / Account) using the same
 * curtain dropdown as the record pickers, so every lookup opens the same way.
 */
export default function RelatedTypeSelect<T extends string>({ value, onChange, options }: RelatedTypeSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const current = options.find(([optionValue]) => optionValue === value)?.[1] ?? "None";

  return (
    <div ref={anchorRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-0 border-b border-line bg-transparent py-2 text-left text-sm outline-none focus:border-slate"
      >
        <span className={value ? "text-fg" : "text-ink-soft"}>{current}</span>
        <ChevronDown size={14} className={`text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <CurtainPanel open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} minWidth={160} ariaLabel="Related to type">
        <div role="listbox" className="overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-2xl">
          {options.map(([optionValue, optionLabel], index) => (
            <button
              key={optionLabel}
              type="button"
              role="option"
              aria-selected={optionValue === value}
              onClick={() => {
                onChange(optionValue);
                setOpen(false);
              }}
              style={{ "--i": index } as React.CSSProperties}
              className="curtain-row flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-paper"
            >
              <span className="w-3 text-slate">{optionValue === value ? <Check size={12} /> : null}</span>
              {optionLabel}
            </button>
          ))}
        </div>
      </CurtainPanel>
    </div>
  );
}
