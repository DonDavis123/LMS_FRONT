"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

export interface RecordPickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface RecordPickerProps {
  options: RecordPickerOption[];
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
  placeholder?: string;
  emptyOptionLabel?: string;
}

/**
 * Searchable combobox for optional relational fields — e.g. a Contact's
 * Account, or a Contact's "Reporting To". Unlike OwnerPicker (always
 * required), this allows clearing back to "no selection."
 */
export default function RecordPicker({
  options,
  value,
  label,
  onChange,
  placeholder = "Select…",
  emptyOptionLabel = "-None-",
}: RecordPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((option) =>
    `${option.label} ${option.sublabel ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-2.5 text-left text-sm outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
        >
          <span className={value ? "text-fg" : "text-ink-soft"}>{label || placeholder}</span>
          <ChevronDown size={14} className="shrink-0 text-ink-soft" />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="shrink-0 rounded-md p-2 text-ink-soft hover:bg-paper hover:text-fg"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-line bg-surface shadow-lg">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-slate"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange("", "");
                  setIsOpen(false);
                  setQuery("");
                }}
                className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-paper"
              >
                {emptyOptionLabel}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-soft">No matches.</li>
            ) : (
              filtered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.id, option.label);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full flex-col px-3 py-2 text-left hover:bg-paper ${
                      option.id === value ? "bg-slate-light" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-fg">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-xs text-ink-soft">{option.sublabel}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
