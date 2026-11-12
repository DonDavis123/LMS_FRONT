"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { getOptionColorStyle } from "@/shared/utils/optionColors";

export interface ModernStatusOption {
  value: string;
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  /** Admin-chosen palette key (see `shared/utils/optionColors`). Wins over `tone`. */
  color?: string;
  description?: string;
}

const TONE = {
  neutral: { dot: "bg-slate", pill: "bg-slate-light text-slate", active: "bg-slate-light" },
  info: { dot: "bg-sky-500", pill: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300", active: "bg-sky-50 dark:bg-sky-950/40" },
  success: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", active: "bg-emerald-50 dark:bg-emerald-950/40" },
  warning: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", active: "bg-amber-50 dark:bg-amber-950/40" },
  danger: { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", active: "bg-rose-50 dark:bg-rose-950/40" },
} as const;

function styleOf(option?: ModernStatusOption) {
  return getOptionColorStyle(option?.color) ?? TONE[option?.tone ?? "neutral"];
}

export default function ModernStatusSelect({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  fullWidth = false,
}: {
  value: string;
  options: ModernStatusOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  fullWidth?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220, maxHeight: 320 });
  const current = options.find((option) => option.value === value) ?? options[0];
  const tone = styleOf(current);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(220, rect.width);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const margin = 8;
      const desiredHeight = Math.min(420, options.length * 56 + 48);
      const spaceBelow = window.innerHeight - rect.bottom - margin * 2;
      const spaceAbove = rect.top - margin * 2;
      const openUp = spaceBelow < Math.min(desiredHeight, 240) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(desiredHeight, openUp ? spaceAbove : spaceBelow));
      const top = openUp ? Math.max(margin, rect.top - margin - maxHeight) : rect.bottom + margin;
      setPosition({ top, left, width, maxHeight });
    };
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = (event: Event) => {
      // Scrolling inside the menu itself must not reposition/close it.
      if (menuRef.current?.contains(event.target as Node)) return;
      reposition();
    };
    reposition();
    document.addEventListener("mousedown", close);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, options.length]);

  function choose(next: string) {
    setOpen(false);
    if (next !== value) onChange(next);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        className={`group/status inline-flex items-center gap-2 rounded-full border border-transparent px-2.5 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate/30 disabled:cursor-wait disabled:opacity-60 ${tone.pill} ${fullWidth ? "w-full justify-between" : "max-w-full"}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot} ${disabled ? "animate-pulse" : ""}`} />
        <span className="min-w-0 truncate">{current?.label ?? value}</span>
        {disabled ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface/95 p-1.5 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl animate-status-menu"
          style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="shrink-0 px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">Choose status</div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5" onWheel={(event) => event.stopPropagation()}>
          {options.map((option) => {
            const optionTone = styleOf(option);
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => choose(option.value)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150 ${selected ? optionTone.active : "hover:bg-paper"}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${optionTone.pill}`}>
                  <span className={`h-2 w-2 rounded-full ${optionTone.dot}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{option.label}</span>
                  {option.description && <span className="mt-0.5 block truncate text-[11px] text-ink-soft">{option.description}</span>}
                </span>
                {selected && <Check size={15} className="shrink-0 text-slate" />}
              </button>
            );
          })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
