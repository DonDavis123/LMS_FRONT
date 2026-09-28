"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Building2, Check, ChevronDown, Plus, Search, X } from "lucide-react";
import CurtainPanel from "@/shared/components/CurtainPanel";
import Spinner from "@/shared/components/Spinner";
import { useRecordSearch } from "@/shared/hooks/useRecordSearch";
import {
  RECORD_KIND_LABEL,
  type RecordKind,
  type RecordSearchItem,
} from "@/shared/services/recordSearch";

export type { RecordKind, RecordSearchItem };

/** Kept for backwards compatibility with older imports. */
export interface RecordPickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface RecordPickerProps {
  /** Which record type to search. Pass `kinds` to search several at once. */
  kind?: RecordKind;
  kinds?: RecordKind[];
  value: string;
  label: string;
  /** Selected record's kind — shown as a badge when several kinds are searched. */
  valueKind?: RecordKind | "";
  onChange: (id: string, label: string, kind?: RecordKind) => void;
  placeholder?: string;
  /** Hide one record (e.g. a contact can't report to itself). */
  excludeId?: string;
  onCreate?: () => void;
  createLabel?: string;
  /** "box" = bordered input (record forms), "underline" = Zoho-style activity forms. */
  variant?: "box" | "underline";
  menuClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const KIND_PLURAL: Record<RecordKind, string> = { lead: "leads", contact: "contacts", account: "accounts" };

const TRIGGER_CLASS = {
  box: "flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-left text-sm outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light disabled:opacity-60",
  underline:
    "flex w-full items-center justify-between gap-2 border-0 border-b border-line bg-transparent py-2 text-left text-sm outline-none transition focus:border-slate disabled:opacity-60",
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Avatar({ item }: { item: RecordSearchItem }) {
  if (item.kind === "account") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink/10 text-ink-soft">
        <Building2 size={14} />
      </span>
    );
  }
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        item.kind === "lead" ? "bg-amber/20 text-amber-dark" : "bg-slate-light text-slate"
      }`}
    >
      {initials(item.label)}
    </span>
  );
}

/**
 * Lookup field for Leads, Contacts and Accounts. Clicking it unrolls a
 * curtain-style panel with a search bar and a results table. Every
 * keystroke (debounced) is sent to the backend list API — nothing is
 * preloaded, so it stays fast with any number of records — and further
 * pages load as the list is scrolled.
 */
export default function RecordPicker({
  kind,
  kinds,
  value,
  label,
  valueKind = "",
  onChange,
  placeholder = "Search…",
  excludeId,
  onCreate,
  createLabel = "New record",
  variant = "box",
  menuClassName = "",
  disabled = false,
  ariaLabel,
}: RecordPickerProps) {
  const searchKinds: RecordKind[] = kinds && kinds.length > 0 ? kinds : [kind ?? "contact"];
  const multiKind = searchKinds.length > 1;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const { items: rawItems, total, loading, loadingMore, error, hasMore, loadMore, retry } = useRecordSearch({
    kinds: searchKinds,
    query,
    enabled: isOpen,
  });

  const items = excludeId ? rawItems.filter((item) => item.id !== excludeId) : rawItems;
  const noun = searchKinds.map((k) => KIND_PLURAL[k]).join(" / ");

  const close = useCallback((refocus = false) => {
    setIsOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [rawItems, query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function select(item: RecordSearchItem) {
    onChange(item.id, item.label, item.kind);
    close(true);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      // Never let Enter submit the surrounding form from inside the picker.
      event.preventDefault();
      if (items[activeIndex]) select(items[activeIndex]);
    } else if (event.key === "Tab") {
      close();
    }
  }

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) void loadMore();
  }

  // If the first page doesn't fill the list, keep pulling pages.
  useEffect(() => {
    const el = listRef.current;
    if (isOpen && el && hasMore && !loading && !loadingMore && el.scrollHeight <= el.clientHeight) {
      void loadMore();
    }
  }, [isOpen, hasMore, loading, loadingMore, items.length, loadMore]);

  const showSkeleton = loading && items.length === 0;

  return (
    <div className="relative">
      <div ref={anchorRef} className="flex items-center gap-1">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listId : undefined}
          onClick={() => (isOpen ? close() : setIsOpen(true))}
          className={TRIGGER_CLASS[variant]}
        >
          <span className="flex min-w-0 items-center gap-2">
            {multiKind && value && valueKind && (
              <span className="shrink-0 rounded bg-slate-light px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate">
                {RECORD_KIND_LABEL[valueKind]}
              </span>
            )}
            <span className={`truncate ${value ? "text-fg" : "text-ink-soft"}`}>{label || placeholder}</span>
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-ink-soft transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {value && !disabled && (
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

      <CurtainPanel
        open={isOpen}
        anchorRef={anchorRef}
        onClose={() => close(true)}
        minWidth={multiKind ? 360 : 300}
        ariaLabel={`Search ${noun}`}
        className={menuClassName}
      >
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search size={15} className="shrink-0 text-ink-soft" />
            <input
              data-autofocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              placeholder={`Search ${noun}…`}
              className="min-w-0 flex-1 bg-transparent py-1 text-sm text-fg outline-none placeholder:text-ink-soft"
            />
            {loading && items.length > 0 && <Spinner size="sm" />}
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="rounded p-0.5 text-ink-soft hover:text-fg"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1.3fr_1fr] gap-3 border-b border-line bg-paper/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            <span>Name</span>
            <span>Details</span>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            onScroll={handleScroll}
            className={`max-h-60 overflow-y-auto overscroll-contain transition-opacity ${
              loading && items.length > 0 ? "opacity-60" : ""
            }`}
          >
            {showSkeleton &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1.3fr_1fr] items-center gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-7 w-7 animate-shimmer rounded-full" />
                    <span className="h-3 w-24 animate-shimmer rounded" />
                  </div>
                  <span className="h-3 w-20 animate-shimmer rounded" />
                </div>
              ))}

            {!showSkeleton && error && (
              <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-sm text-ink-soft">
                <AlertCircle size={18} className="text-danger" />
                {error}
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-md border border-line px-3 py-1 text-xs font-semibold text-fg hover:bg-paper"
                >
                  Try again
                </button>
              </div>
            )}

            {!showSkeleton && !error && items.length === 0 && !loading && (
              <p className="px-3 py-6 text-center text-sm text-ink-soft">
                {query.trim() ? `No ${noun} match “${query.trim()}”.` : `No ${noun} yet.`}
              </p>
            )}

            {!error &&
              items.map((item, index) => {
                const selected = item.id === value && (!valueKind || valueKind === item.kind || !multiKind);
                const active = index === activeIndex;
                return (
                  <div
                    key={`${item.kind}:${item.id}`}
                    role="option"
                    aria-selected={selected}
                    data-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => select(item)}
                    style={{ "--i": Math.min(index, 9) } as React.CSSProperties}
                    className={`curtain-row grid cursor-pointer grid-cols-[1.3fr_1fr] items-center gap-3 px-3 py-2 ${
                      active ? "bg-paper" : ""
                    } ${selected ? "bg-slate-light" : ""}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar item={item} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg">{item.label}</span>
                        {multiKind && (
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                            {RECORD_KIND_LABEL[item.kind]}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-xs text-ink-soft">{item.sublabel ?? "—"}</span>
                      {selected && <Check size={14} className="shrink-0 text-slate" />}
                    </span>
                  </div>
                );
              })}

            {loadingMore && (
              <div className="flex justify-center py-2">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Footer */}
          {(onCreate || (!error && total > 0)) && (
            <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
              <span className="text-xs text-ink-soft">
                {!error && total > 0 ? `${Math.min(items.length, total)} of ${total}` : ""}
              </span>
              {onCreate && (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onCreate();
                  }}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline"
                >
                  <Plus size={14} />
                  {createLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </CurtainPanel>
    </div>
  );
}
