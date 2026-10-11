"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface SearchBoxProps {
  /** Applied search text; the box debounces before calling `onSearchChange`. */
  value: string;
  onSearchChange: (search: string) => void;
  placeholder: string;
  ariaLabel: string;
}

// Backend limit for `search`.
const SEARCH_MAX_LENGTH = 100;
const SEARCH_DEBOUNCE_MS = 300;

/** Debounced server-side search box, same look and behaviour as the Users list. */
export default function SearchBox({ value, onSearchChange, placeholder, ariaLabel }: SearchBoxProps) {
  const [input, setInput] = useState(value);

  // Send the search to the server once typing pauses, not on every keystroke.
  useEffect(() => {
    const next = input.trim();
    if (next === value) return;
    const timer = window.setTimeout(() => onSearchChange(next), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input, value, onSearchChange]);

  return (
    <div className="relative w-full sm:w-64">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
      <input
        type="search"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-md border border-line bg-surface py-1.5 pl-9 pr-3 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
      />
    </div>
  );
}
