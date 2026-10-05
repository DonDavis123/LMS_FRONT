"use client";

import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional second line shown under the label in the menu. */
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Shown when `value` matches no option (e.g. an empty selection). */
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  /** `md` matches form inputs; `sm` is the compact variant for toolbars and pagination. */
  size?: "md" | "sm";
  /** Extra classes for the trigger, e.g. to size it inside a toolbar. */
  className?: string;
}

const MENU_MAX_HEIGHT = 288;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

const TRIGGER_SIZE = {
  md: "px-3 py-2.5 text-sm",
  sm: "px-2.5 py-1.5 text-sm",
} as const;

/**
 * Themed replacement for the browser's native `<select>` — shared by every
 * form, filter and toolbar so dropdowns look and behave the same everywhere.
 *
 * The menu renders in a portal (so modals and scroll containers never clip
 * it), flips above the trigger when there is no room below, and supports
 * the keyboard: ↑/↓, Home/End, Enter/Space to pick, Esc to close, and
 * type-ahead on the first letter.
 */
export default function Select({
  value,
  options,
  onChange,
  placeholder = "Select…",
  disabled = false,
  ariaLabel,
  ariaInvalid = false,
  size = "md",
  className = "",
}: SelectProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: MENU_MAX_HEIGHT, above: false });

  const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value]);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const reposition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - MENU_GAP - VIEWPORT_MARGIN;
    const above = spaceBelow < Math.min(MENU_MAX_HEIGHT, 180) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(MENU_MAX_HEIGHT, above ? spaceAbove : spaceBelow));
    const width = rect.width;
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), window.innerWidth - width - VIEWPORT_MARGIN);
    setPosition({
      top: above ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      left,
      width,
      maxHeight,
      above,
    });
  }, []);

  function openMenu() {
    if (disabled) return;
    reposition();
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(options, 0, 1));
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    setOpen(false);
    if (option.value !== value) onChange(option.value);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll(event: Event) {
      // Scrolling inside the menu itself must not reposition or close it.
      if (menuRef.current?.contains(event.target as Node)) return;
      reposition();
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, reposition]);

  // Keep the highlighted option in view while navigating with the keyboard.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        // Don't let a surrounding modal also treat this Esc as "close me".
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        break;
      case "Tab":
        closeMenu();
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) => firstEnabled(options, current + 1, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) => firstEnabled(options, current - 1, -1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(firstEnabled(options, 0, 1));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(firstEnabled(options, options.length - 1, -1));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const letter = event.key.toLowerCase();
          const start = activeIndex + 1;
          const ordered = Array.from(options, (_, i) => (start + i) % options.length);
          const match = ordered.find(
            (index) => !options[index].disabled && options[index].label.toLowerCase().startsWith(letter),
          );
          if (match !== undefined) setActiveIndex(match);
        }
    }
  }

  const activeId = open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={activeId}
        onClick={(event) => {
          // Inside a <label> a stray second click would re-toggle the menu.
          event.preventDefault();
          if (open) closeMenu();
          else openMenu();
        }}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-surface text-left text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light disabled:cursor-not-allowed disabled:opacity-60 ${
          ariaInvalid ? "border-danger" : open ? "border-slate ring-2 ring-slate-light" : "border-line"
        } ${TRIGGER_SIZE[size]} ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-ink-soft"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className={`fixed z-[200] overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-[0_16px_48px_rgba(15,23,42,0.18)] ${
              position.above ? "animate-popover-up" : "animate-popover-down"
            }`}
            style={{
              left: position.left,
              minWidth: position.width,
              maxHeight: position.maxHeight,
              ...(position.above ? { bottom: window.innerHeight - position.top } : { top: position.top }),
            }}
          >
            {options.length === 0 && <p className="px-3 py-2 text-sm text-ink-soft">No options</p>}
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === activeIndex;
              return (
                <div
                  key={option.value || `__empty-${index}`}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                    option.disabled ? "cursor-not-allowed opacity-50" : isActive ? "bg-paper" : ""
                  } ${isSelected ? "font-semibold text-fg" : "text-fg"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-[11px] font-normal text-ink-soft">{option.description}</span>
                    )}
                  </span>
                  {isSelected && <Check size={14} className="shrink-0 text-slate" />}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Next enabled option index from `from`, stepping by `step`, clamped to the list. */
function firstEnabled(options: SelectOption[], from: number, step: 1 | -1): number {
  for (let i = from; i >= 0 && i < options.length; i += step) {
    if (!options[i].disabled) return i;
  }
  // Ran off the end: stay on the nearest enabled edge instead of losing the highlight.
  const edge = step === 1 ? options.length - 1 : 0;
  for (let i = edge; i >= 0 && i < options.length; i -= step) {
    if (!options[i].disabled) return i;
  }
  return -1;
}
