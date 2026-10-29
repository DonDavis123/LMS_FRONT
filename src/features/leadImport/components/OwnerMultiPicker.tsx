"use client";

import { AlertCircle, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { MIN_ROTATION_OWNERS } from "@/features/leadImport/utils/optionRules";

interface OwnerMultiPickerProps {
  owners: LeadOwnerOption[];
  /** Ids in the order they will take turns. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Why the current choice cannot be used, if it cannot. */
  issue?: string | null;
  ariaLabel: string;
}

const textButton =
  "rounded text-xs font-semibold text-slate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline";

/** Pick several owners who take turns. Same look as OwnerPicker, with a checklist and ordered chips. */
export default function OwnerMultiPicker({ owners, selectedIds, onChange, issue = null, ariaLabel }: OwnerMultiPickerProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");

  const byId = useMemo(() => new Map(owners.map((owner) => [owner.id, owner])), [owners]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? owners.filter((owner) => `${owner.name} ${owner.email}`.toLowerCase().includes(needle))
    : owners;

  function toggle(id: string) {
    onChange(selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  function selectAllShown() {
    const additions = filtered.map((owner) => owner.id).filter((id) => !selected.has(id));
    if (additions.length > 0) onChange([...selectedIds, ...additions]);
  }

  const count = selectedIds.length;
  const allShownSelected = filtered.length > 0 && filtered.every((owner) => selected.has(owner.id));

  return (
    <div role="group" aria-label={ariaLabel} className="space-y-2">
      <div className="rounded-md border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line p-2">
          <div className="relative min-w-0 flex-1 basis-40">
            <label htmlFor={searchId} className="sr-only">
              Search owners by name or email
            </label>
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email…"
              className="w-full rounded border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-fg outline-none focus:border-slate focus:ring-2 focus:ring-slate-light"
            />
          </div>
          <button type="button" className={textButton} onClick={selectAllShown} disabled={allShownSelected || filtered.length === 0}>
            Select all
          </button>
          <button type="button" className={textButton} onClick={() => onChange([])} disabled={count === 0}>
            Clear
          </button>
        </div>

        <ul className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-soft">No matching users.</li>
          ) : (
            filtered.map((owner) => (
              <li key={owner.id}>
                <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-paper">
                  <input
                    type="checkbox"
                    checked={selected.has(owner.id)}
                    onChange={() => toggle(owner.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{owner.name}</span>
                    <span className="block truncate text-xs text-ink-soft">{owner.email}</span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
      </div>

      {count > 0 && (
        <ol className="flex flex-wrap gap-1.5" aria-label="Owners in the order they will take turns">
          {selectedIds.map((id, index) => {
            const owner = byId.get(id);
            return (
              <li
                key={id}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium ${
                  owner ? "bg-slate-light text-slate" : "bg-danger-soft text-danger"
                }`}
              >
                <span className="tabular-nums opacity-70" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="truncate">{owner ? owner.name : "Unavailable owner"}</span>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`Remove ${owner ? owner.name : "unavailable owner"}`}
                  className="rounded-full p-0.5 hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {issue ? (
        <p className="flex items-start gap-1.5 text-xs text-fg" role="status">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-dark" aria-hidden="true" />
          {issue}
        </p>
      ) : (
        <p className="text-xs text-ink-soft" aria-live="polite">
          {count >= MIN_ROTATION_OWNERS
            ? `Leads will be shared between ${count} owners in turn`
            : `Choose at least ${MIN_ROTATION_OWNERS} owners. They take turns in the order shown above.`}
        </p>
      )}
    </div>
  );
}
