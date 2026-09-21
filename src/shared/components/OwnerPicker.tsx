"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";

interface OwnerPickerProps {
  owners: LeadOwnerOption[];
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
  placeholder?: string;
}

/**
 * Shared "assign owner" combobox — used on the Lead, Contact, and Account
 * forms. Backed by GET /lead-owners/, which returns each user's name and
 * email so records can be reassigned unambiguously.
 */
export default function OwnerPicker({
  owners,
  value,
  label,
  onChange,
  placeholder = "Select owner…",
}: OwnerPickerProps) {
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

  const filtered = owners.filter((owner) =>
    `${owner.name} ${owner.email}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-2.5 text-left text-sm outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
      >
        <span className={value ? "text-fg" : "text-ink-soft"}>{label || placeholder}</span>
        <ChevronDown size={14} className="shrink-0 text-ink-soft" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-line bg-surface shadow-lg">
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-slate"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-soft">No matching users.</li>
            ) : (
              filtered.map((owner) => (
                <li key={owner.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(owner.id, owner.name);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full flex-col px-3 py-2 text-left hover:bg-paper ${
                      owner.id === value ? "bg-slate-light" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-fg">{owner.name}</span>
                    <span className="text-xs text-ink-soft">{owner.email}</span>
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
