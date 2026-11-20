"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchBoxProps {
  /** Applied search text; the box debounces before calling `onSearchChange`. */
  value: string;
  onSearchChange: (search: string) => void;
  placeholder: string;
  ariaLabel: string;
  /**
   * Press "/" anywhere on the page to jump into this box. Opt-in so that only
   * one box per page (the main list search) claims the shortcut.
   */
  enableShortcut?: boolean;
}

// Backend limit for `search`.
const SEARCH_MAX_LENGTH = 100;
const SEARCH_DEBOUNCE_MS = 300;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Debounced server-side search box.
 *
 * - Grows slightly on focus and lights up with the brand accent.
 * - Shows a small spinner in place of the magnifier while a search is pending.
 * - Clear button (and Esc) resets instantly, without waiting for the debounce.
 * - Optional "/" shortcut to focus, advertised with a key hint.
 */
export default function SearchBox({
  value,
  onSearchChange,
  placeholder,
  ariaLabel,
  enableShortcut = false,
}: SearchBoxProps) {
  const [input, setInput] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Send the search to the server once typing pauses, not on every keystroke.
  useEffect(() => {
    const next = input.trim();
    if (next === value) return;
    const timer = window.setTimeout(() => onSearchChange(next), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input, value, onSearchChange]);

  // "/" focuses the box, like GitHub, Linear and Gmail.
  useEffect(() => {
    if (!enableShortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableShortcut]);

  const hasText = input.length > 0;
  // Typed text that the list hasn't applied yet.
  const pending = input.trim() !== value;

  function clear() {
    setInput("");
    if (value !== "") onSearchChange("");
    inputRef.current?.focus();
  }

  return (
    <div className="group relative w-full transition-[width] duration-200 ease-out sm:w-72 sm:focus-within:w-80 lg:w-80 lg:focus-within:w-96">
      <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-ink-soft transition-colors group-focus-within:text-amber-dark">
        {pending ? (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-amber"
          />
        ) : (
          <Search size={15} aria-hidden="true" />
        )}
      </span>

      <input
        ref={inputRef}
        type="search"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          if (hasText) {
            event.preventDefault();
            clear();
          } else {
            inputRef.current?.blur();
          }
        }}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className="h-9 w-full truncate rounded-lg border border-line bg-paper/70 pl-9 pr-9 text-sm text-fg shadow-sm outline-none transition placeholder:text-ink-soft/70 hover:border-slate/40 hover:bg-surface focus:border-amber focus:bg-surface focus:ring-4 focus:ring-amber/15 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />

      {hasText ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-line/70 text-ink-soft transition hover:bg-line hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          <X size={12} aria-hidden="true" />
        </button>
      ) : (
        enableShortcut && (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none rounded border border-line bg-surface px-1.5 font-sans text-[11px] font-medium leading-5 text-ink-soft transition-opacity group-focus-within:opacity-0 sm:block"
          >
            /
          </kbd>
        )
      )}
    </div>
  );
}
