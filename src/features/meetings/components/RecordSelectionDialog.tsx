"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Search, X } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import { useRecordSearch } from "@/shared/hooks/useRecordSearch";
import type { MeetingParticipantType } from "@/features/meetings/types/meeting.types";
import {
  RECORD_TYPE_LABEL,
  RecordAvatar,
  recordKey,
  type SelectedRecord,
} from "@/features/meetings/components/SelectedRecordsField";

export interface SelectionCategory {
  type: MeetingParticipantType;
  /** Plural label for the tab, e.g. "Leads". */
  label: string;
}

interface RecordSelectionDialogProps {
  title: string;
  subtitle?: string;
  /** The record types that can be picked. The first one is shown initially. */
  categories: SelectionCategory[];
  selected: SelectedRecord[];
  /** Adds the record, or removes it when it is already selected. */
  onToggle: (record: SelectedRecord) => void;
  onClear: () => void;
  onClose: () => void;
  /** The (small) list of users, filtered locally. Only needed for a "user" category. */
  users?: SelectedRecord[];
  usersLoading?: boolean;
}

/**
 * Multi-select picker for users, leads and contacts. Leads and contacts are
 * searched on the server as you type and load more as you scroll, so it stays
 * fast with any number of records. Everything ticked — across all tabs — stays
 * selected until it is un-ticked; switching tabs or searching never drops it.
 */
export default function RecordSelectionDialog({
  title,
  subtitle,
  categories,
  selected,
  onToggle,
  onClear,
  onClose,
  users = [],
  usersLoading = false,
}: RecordSelectionDialogProps) {
  const titleId = useId();
  const [category, setCategory] = useState<MeetingParticipantType>(categories[0]?.type ?? "user");
  const [query, setQuery] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Escape closes just this dialog, not the meeting form underneath it.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  const selectedKeys = useMemo(() => new Set(selected.map(recordKey)), [selected]);
  const countFor = (type: MeetingParticipantType) => selected.filter((record) => record.type === type).length;

  const remote = category !== "user" && !showSelectedOnly;
  const searchKind = category === "lead" ? "lead" : "contact";
  const search = useRecordSearch({
    kinds: [searchKind],
    query,
    enabled: remote,
  });
  // The hook keeps the previous results while a new tab loads; never show those.
  const searchItems = useMemo(
    () => search.items.filter((item) => item.kind === searchKind),
    [search.items, searchKind],
  );

  const rows = useMemo<SelectedRecord[]>(() => {
    const needle = query.trim().toLowerCase();
    const matches = (record: SelectedRecord) =>
      !needle || `${record.name} ${record.email ?? ""}`.toLowerCase().includes(needle);

    if (showSelectedOnly) return selected.filter(matches);
    if (category === "user") return users.filter(matches);
    return searchItems.map((item) => ({
      id: item.id,
      name: item.label,
      email: item.email ?? null,
      type: item.kind as MeetingParticipantType,
      detail: item.sublabel ?? null,
    }));
  }, [showSelectedOnly, selected, category, users, searchItems, query]);

  const loadingFirstPage = showSelectedOnly
    ? false
    : category === "user"
      ? usersLoading && users.length === 0
      : search.loading && searchItems.length === 0;
  const activeLabel = categories.find((item) => item.type === category)?.label.toLowerCase() ?? "records";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-3 pt-[8vh] animate-fade-in sm:p-6 sm:pt-[10vh]"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-2xl animate-scale-in sm:max-h-[min(36rem,80dvh)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-semibold">
              {title}
            </h3>
            {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 shrink-0 rounded-md p-1.5 text-ink-soft transition hover:bg-paper hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="space-y-3 border-b border-line px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {categories.length > 1 ? (
              <div role="tablist" aria-label="Record type" className="inline-flex rounded-lg bg-paper p-0.5">
                {categories.map((item) => {
                  const active = item.type === category && !showSelectedOnly;
                  const count = countFor(item.type);
                  return (
                    <button
                      key={item.type}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setCategory(item.type);
                        setShowSelectedOnly(false);
                        setQuery("");
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        active ? "bg-surface text-fg shadow-sm" : "text-ink-soft hover:text-fg"
                      }`}
                    >
                      {item.label}
                      {count > 0 && (
                        <span className="rounded-full bg-indigo-500/15 px-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="text-sm font-medium">{categories[0]?.label}</span>
            )}

            <button
              type="button"
              aria-pressed={showSelectedOnly}
              onClick={() => setShowSelectedOnly((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                showSelectedOnly
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                  : "border-line text-ink-soft hover:bg-paper hover:text-fg"
              }`}
            >
              <Check size={14} />
              Selected ({selected.length})
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-slate focus-within:ring-2 focus-within:ring-slate-light">
            <Search size={15} className="shrink-0 text-ink-soft" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // Enter must never submit the meeting form behind this dialog.
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder={showSelectedOnly ? "Search selected" : `Search ${activeLabel}`}
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-ink-soft"
            />
            {remote && search.loading && searchItems.length > 0 && <Spinner size="sm" />}
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="rounded p-0.5 text-ink-soft hover:text-fg"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={showSelectedOnly ? "Selected records" : `Available ${activeLabel}`}
          className="min-h-40 flex-1 overflow-y-auto overscroll-contain"
          onScroll={(event) => {
            if (!remote) return;
            const el = event.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) void search.loadMore();
          }}
        >
          {loadingFirstPage ? (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-ink-soft">
              <Spinner size="sm" /> {category === "user" ? "Loading users…" : "Searching…"}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-sm text-ink-soft">
              {remote && search.error ? (
                <>
                  {search.error}
                  <button
                    type="button"
                    onClick={search.retry}
                    className="rounded-md border border-line px-3 py-1 text-xs font-semibold text-fg hover:bg-paper"
                  >
                    Try again
                  </button>
                </>
              ) : showSelectedOnly ? (
                query.trim() ? (
                  "No selected records match your search."
                ) : (
                  "Nothing selected yet."
                )
              ) : query.trim() ? (
                `No ${activeLabel} match “${query.trim()}”.`
              ) : (
                `No ${activeLabel} found.`
              )}
            </div>
          ) : (
            <ul className="divide-y divide-line/70">
              {rows.map((record) => {
                const checked = selectedKeys.has(recordKey(record));
                const secondary = record.email || record.detail || null;
                return (
                  <li key={recordKey(record)}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => onToggle(record)}
                      className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition ${
                        checked ? "bg-indigo-500/[0.07]" : "hover:bg-paper"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition ${
                          checked ? "border-indigo-500 bg-indigo-500 text-white" : "border-line bg-surface"
                        }`}
                      >
                        {checked && <Check size={12} strokeWidth={3} />}
                      </span>
                      <RecordAvatar type={record.type ?? "user"} name={record.name} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{record.name}</span>
                        {secondary && <span className="block truncate text-xs text-ink-soft">{secondary}</span>}
                      </span>
                      {(showSelectedOnly || categories.length > 1) && (
                        <span className="shrink-0 rounded bg-paper px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                          {RECORD_TYPE_LABEL[record.type ?? "user"]}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {remote && search.loadingMore && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            <span>
              <span className="font-semibold text-fg">{selected.length}</span> selected
            </span>
            {selected.length > 0 && (
              <button type="button" onClick={onClear} className="font-medium text-indigo-500 hover:underline dark:text-indigo-400">
                Clear all
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
