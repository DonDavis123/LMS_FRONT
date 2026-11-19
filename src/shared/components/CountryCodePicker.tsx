"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import CountryFlag from "@/shared/components/CountryFlag";
import { inputClass } from "@/shared/components/FormLayout";
import { COUNTRIES, type Country } from "@/shared/utils/countryCodes";

interface CountryCodePickerProps {
  country: Country;
  onChange: (iso: string) => void;
  /** Extra classes for the trigger, e.g. the red error border. */
  stateClass?: string;
}

const MENU_WIDTH = 288;
const MENU_MAX_HEIGHT = 320;
const GAP = 6;
const MARGIN = 8;

/**
 * Country-code dropdown for phone inputs: flag + dial code on the button,
 * and a searchable list of flag / country / dial code in the menu.
 * The menu renders in a portal so modals and scroll areas never clip it.
 */
export default function CountryCodePicker({ country, onChange, stateClass = "" }: CountryCodePickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, maxHeight: MENU_MAX_HEIGHT });

  const results = useMemo(() => {
    const text = query.trim().toLowerCase().replace(/^\+/, "");
    if (!text) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(text) || c.dial.startsWith(text) || c.iso.toLowerCase() === text
    );
  }, [query]);

  function reposition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - GAP - MARGIN;
    const above = rect.top - GAP - MARGIN;
    const flip = below < 220 && above > below;
    const maxHeight = Math.max(160, Math.min(MENU_MAX_HEIGHT, flip ? above : below));
    const left = Math.min(Math.max(MARGIN, rect.left), window.innerWidth - MENU_WIDTH - MARGIN);
    setPos({ top: flip ? Math.max(MARGIN, rect.top - GAP - maxHeight) : rect.bottom + GAP, left, maxHeight });
  }

  function openMenu() {
    reposition();
    setQuery("");
    setActive(Math.max(0, COUNTRIES.findIndex((c) => c.iso === country.iso)));
    setOpen(true);
  }

  function choose(c: Country) {
    setOpen(false);
    if (c.iso !== country.iso) onChange(c.iso);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScroll(event: Event) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", reposition);
    };
    // `reposition` only reads refs and window size, so it is stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted row visible while moving with the arrow keys.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = results[active];
      if (picked) choose(picked);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country code: ${country.name} (+${country.dial})`}
        title={`${country.name} (+${country.dial})`}
        className={`${inputClass} flex w-[6.5rem] shrink-0 items-center justify-between gap-1.5 px-2.5 text-left ${stateClass}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CountryFlag iso={country.iso} />
          <span className="truncate">+{country.dial}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            onKeyDown={onKeyDown}
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH, maxHeight: pos.maxHeight }}
            className="fixed z-[200] flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_16px_48px_rgba(15,23,42,0.18)]"
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <Search size={14} className="shrink-0 text-ink-soft" aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search country or code"
                aria-label="Search country or code"
                className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-ink-soft/60"
              />
            </div>
            <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1">
              {results.length === 0 && <li className="px-3 py-2 text-sm text-ink-soft">No matching country.</li>}
              {results.map((c, index) => {
                const selected = c.iso === country.iso;
                return (
                  <li
                    key={c.iso}
                    role="option"
                    aria-selected={selected}
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(c)}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      index === active ? "bg-paper" : ""
                    }`}
                  >
                    <CountryFlag iso={c.iso} />
                    <span className="min-w-0 flex-1 truncate text-fg">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-ink-soft">+{c.dial}</span>
                    {selected && <Check size={14} className="shrink-0 text-fg" aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}
