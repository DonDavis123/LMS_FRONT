"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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

/** Row height used to size the menu before it is measured. */
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 34;
/** Matches the exit animation (.lp-status-menu[data-closing]) in globals.css. */
const CLOSE_MS = 110;

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
  const listRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 220, maxHeight: 320, openUp: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const current = options.find((option) => option.value === value) ?? options[0];
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const tone = styleOf(current);
  const isOpen = open && !closing;

  const closeMenu = useCallback((returnFocus = false) => {
    setClosing(true);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_MS);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  const updateEdges = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  // Position the menu next to the trigger and keep it there on scroll / resize.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(220, rect.width);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const margin = 8;
      const desiredHeight = Math.min(360, options.length * ROW_HEIGHT + HEADER_HEIGHT + 12);
      const spaceBelow = window.innerHeight - rect.bottom - margin * 2;
      const spaceAbove = rect.top - margin * 2;
      const openUp = spaceBelow < Math.min(desiredHeight, 240) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(desiredHeight, openUp ? spaceAbove : spaceBelow));
      const top = openUp ? Math.max(margin, rect.top - margin - maxHeight) : rect.bottom + margin;
      setPosition({ top, left, width, maxHeight, openUp });
    };
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };
    const onScroll = (event: Event) => {
      // Scrolling inside the menu itself must not reposition/close it.
      if (menuRef.current?.contains(event.target as Node)) return;
      reposition();
    };
    reposition();
    document.addEventListener("mousedown", outside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, options.length, closeMenu]);

  // On open: highlight the current value and bring it into view.
  useEffect(() => {
    if (!open) return;
    setActiveIndex(currentIndex);
    const frame = window.requestAnimationFrame(() => {
      const list = listRef.current;
      const row = list?.querySelector<HTMLElement>(`[data-idx="${currentIndex}"]`);
      if (list && row) list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2);
      updateEdges();
    });
    return () => window.cancelAnimationFrame(frame);
    // Only when the menu opens — not on every value change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the keyboard-highlighted row visible.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop - 4;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight + 4;
    }
  }, [activeIndex, open]);

  function choose(next: string) {
    closeMenu(true);
    if (next !== value) onChange(next);
  }

  // Keyboard: ↑ ↓ Home End to move, Enter / Space to pick, Esc to dismiss.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      const last = options.length - 1;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => (i >= last ? 0 : i + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? last : i - 1));
      } else if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(last);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const option = options[activeIndex];
        if (option) choose(option.value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
      } else if (event.key === "Tab") {
        closeMenu();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeIndex, options, value]);

  const maskTop = edges.top ? "transparent" : "#000";
  const maskBottom = edges.bottom ? "transparent" : "#000";
  const mask = `linear-gradient(to bottom, ${maskTop} 0, #000 14px, #000 calc(100% - 14px), ${maskBottom} 100%)`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          if (open && !closing) closeMenu();
          else {
            if (closeTimer.current) window.clearTimeout(closeTimer.current);
            setClosing(false);
            setOpen(true);
          }
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        className={`group/status inline-flex items-center gap-2 rounded-full border border-current/15 py-1 pl-2.5 pr-1.5 text-xs font-semibold shadow-[0_1px_2px_rgba(18,33,58,0.06)] outline-none transition-[box-shadow,filter,transform,border-color] duration-200 hover:border-current/30 hover:shadow-[0_3px_10px_-2px_rgba(18,33,58,0.16)] hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-current/30 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70 ${
          isOpen ? "border-current/35 ring-2 ring-current/15 shadow-[0_3px_10px_-2px_rgba(18,33,58,0.16)]" : ""
        } ${tone.pill} ${fullWidth ? "w-full justify-between" : "max-w-full"}`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          {(isOpen || disabled) && (
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${disabled ? "animate-ping" : "lp-status-halo"} ${tone.dot}`} />
          )}
          <span className={`relative h-2 w-2 rounded-full ${tone.dot}`} />
        </span>
        <span className="min-w-0 truncate">{current?.label ?? value}</span>
        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-current/10 transition-colors duration-200 group-hover/status:bg-current/20">
          {disabled ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <ChevronDown
              size={11}
              strokeWidth={2.5}
              className={`transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? "rotate-180" : ""}`}
            />
          )}
        </span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          data-closing={closing || undefined}
          className="lp-status-menu fixed z-[200] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_2px_6px_rgba(18,33,58,0.06),0_24px_56px_-12px_rgba(18,33,58,0.28)] ring-1 ring-black/[0.03] dark:ring-white/10"
          style={
            {
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              transformOrigin: position.openUp ? "bottom left" : "top left",
              "--lp-sm-shift": position.openUp ? "6px" : "-6px",
            } as CSSProperties
          }
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between px-2.5 pb-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">Choose status</span>
            <span className="rounded-full bg-paper px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-soft">{options.length}</span>
          </div>
          <div className="mx-1 mb-1 h-px shrink-0 bg-line" />
          <div
            ref={listRef}
            onScroll={updateEdges}
            onWheel={(event) => event.stopPropagation()}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
            style={{ WebkitMaskImage: mask, maskImage: mask }}
          >
            {options.map((option, index) => {
              const optionTone = styleOf(option);
              const selected = option.value === value;
              const highlighted = index === activeIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  data-idx={index}
                  aria-selected={selected}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option.value)}
                  style={{ ["--lp-i" as string]: Math.min(index, 9) } as CSSProperties}
                  className={`lp-status-opt group/opt relative flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-150 ${
                    selected ? optionTone.active : highlighted ? "bg-paper" : ""
                  } ${selected && highlighted ? "ring-1 ring-inset ring-current/10" : ""}`}
                >
                  {selected && <span className={`absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full ${optionTone.dot}`} />}
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${optionTone.pill} ${
                      highlighted ? "scale-110" : ""
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${optionTone.dot}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[13px] text-fg ${selected ? "font-semibold" : "font-medium"}`}>{option.label}</span>
                    {option.description && <span className="block truncate text-[11px] leading-tight text-ink-soft">{option.description}</span>}
                  </span>
                  {selected && <Check size={14} strokeWidth={2.75} className="lp-status-check shrink-0 text-slate" />}
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
