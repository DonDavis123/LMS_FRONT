"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileSpreadsheet, FileText, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useExport } from "@/features/exports/hooks/useExport";
import {
  MAX_EXPORT_ROWS,
  type ExportEntity,
  type ExportFormat,
  type ExportQuery,
} from "@/features/exports/types/export.types";
import FloatingPopover from "@/shared/components/FloatingPopover";
import Spinner from "@/shared/components/Spinner";

interface ExportMenuProps {
  entity: ExportEntity;
  /** Plural, lower-case name used in the copy, e.g. "leads". */
  noun: string;
  /** The search, filters and sort on screen; the file holds every row that matches them. */
  query: ExportQuery;
  /** How many rows match right now (the list's total, not the page size). */
  total: number;
  /** True while the list itself is still loading. */
  disabled?: boolean;
}

const FORMATS: ReadonlyArray<{
  format: ExportFormat;
  label: string;
  hint: string;
  description: string;
  Icon: typeof FileText;
}> = [
  { format: "xlsx", label: "Excel", hint: ".xlsx", description: "Formatted spreadsheet with a frozen header row", Icon: FileSpreadsheet },
  { format: "csv", label: "CSV", hint: ".csv", description: "Plain text that opens in any spreadsheet app", Icon: FileText },
];

function formatCount(value: number): string {
  return value.toLocaleString();
}

export default function ExportMenu({ entity, noun, query, total, disabled = false }: ExportMenuProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { busyFormat, notice, run, dismissNotice } = useExport(entity, noun);

  const busy = busyFormat !== null;
  const isFiltered = Boolean(query.search?.trim()) || (query.filters?.length ?? 0) > 0;
  const isEmpty = total === 0;
  const tooLarge = total > MAX_EXPORT_ROWS;
  const blocked = isEmpty || tooLarge;
  const singular = total === 1 ? noun.replace(/s$/, "") : noun;

  const close = useCallback(() => {
    setOpen(false);
    anchorRef.current?.focus();
  }, []);

  // Move focus into the menu when it opens so it works from the keyboard.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => listRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  function handleSelect(format: ExportFormat) {
    if (blocked || busy) return;
    setOpen(false);
    void run(query, format);
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? []);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  const buttonTitle = isEmpty ? `There are no ${noun} to export` : undefined;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={busy || disabled || isEmpty}
        title={buttonTitle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {busy ? <Spinner size="sm" /> : <Download size={14} aria-hidden="true" />}
        {busy ? "Exporting…" : "Export"}
        {!busy && (
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        )}
      </button>

      {open && (
        <FloatingPopover anchorRef={anchorRef} onClose={close} width={300} ariaLabel={`Export ${noun}`}>
          <div ref={listRef} onKeyDown={handleListKeyDown} className="-m-2 space-y-1">
            <div className="px-2 pb-1.5">
              <p className="font-serif text-base leading-tight text-fg">Export {noun}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {isFiltered
                  ? `${formatCount(total)} ${singular} matching your search and filters`
                  : `All ${formatCount(total)} ${singular}`}
                . Every page is included, in your current sort order.
              </p>
            </div>

            {tooLarge && (
              <div
                role="alert"
                className="mx-2 mb-1 flex items-start gap-2 rounded-md border border-amber/40 bg-amber/10 px-2.5 py-2 text-xs text-fg"
              >
                <AlertTriangle size={14} className="mt-px shrink-0 text-amber-dark" aria-hidden="true" />
                <span>
                  An export holds up to {formatCount(MAX_EXPORT_ROWS)} rows. Narrow your search or filters to export these{" "}
                  {noun}.
                </span>
              </div>
            )}

            <div className="space-y-0.5 border-t border-line pt-1.5">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Format</p>
              {FORMATS.map(({ format, label, hint, description, Icon }) => (
                <button
                  key={format}
                  type="button"
                  disabled={blocked}
                  onClick={() => handleSelect(format)}
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left outline-none transition hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <Icon size={16} className="mt-0.5 shrink-0 text-slate" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm font-medium text-fg">
                      {label}
                      <span className="text-xs font-normal text-ink-soft">{hint}</span>
                    </span>
                    <span className="block text-xs text-ink-soft">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </FloatingPopover>
      )}

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live={notice.tone === "error" ? "assertive" : "polite"}
          className={`fixed bottom-6 right-4 z-[60] flex max-w-[calc(100vw-2rem)] items-start gap-2 rounded-md border px-4 py-3 text-sm font-medium shadow-lg animate-toast-in sm:right-6 sm:max-w-sm ${
            notice.tone === "error"
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-success/30 bg-success-soft text-success"
          }`}
        >
          {notice.tone === "error" ? (
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 animate-pop-in" aria-hidden="true" />
          )}
          <span className="min-w-0 break-words">{notice.text}</span>
          <button
            type="button"
            onClick={dismissNotice}
            aria-label="Dismiss"
            className="-mr-1 ml-1 shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
