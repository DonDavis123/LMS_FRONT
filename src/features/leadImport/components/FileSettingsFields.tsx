"use client";

import { Loader2 } from "lucide-react";
import { useId, type KeyboardEvent, type RefObject } from "react";
import Select from "@/shared/components/Select";

interface FileSettingsFieldsProps {
  headerRowText: string;
  headerRowError: string | null;
  onHeaderRowChange: (text: string) => void;
  /** Hidden when the file has a single sheet (or is a CSV). */
  sheetNames: string[];
  sheetName: string | null;
  onSheetChange: (name: string) => void;
  /** Show the Apply button (settings differ from what was read). */
  showApply: boolean;
  canApply: boolean;
  applying: boolean;
  applyLabel?: string;
  onApply: () => void;
  headerInputRef?: RefObject<HTMLInputElement | null>;
  /** Show the Header row field. Defaults to true. */
  showHeaderRow?: boolean;
}

/** The two re-upload settings: which row holds the column names, and which sheet to read. */
export default function FileSettingsFields({
  headerRowText,
  headerRowError,
  onHeaderRowChange,
  sheetNames,
  sheetName,
  onSheetChange,
  showApply,
  canApply,
  applying,
  applyLabel = "Apply",
  onApply,
  headerInputRef,
  showHeaderRow = true,
}: FileSettingsFieldsProps) {
  const headerId = useId();
  const hintId = `${headerId}-hint`;
  const errorId = `${headerId}-error`;
  const sheetLabelId = useId();

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (canApply) onApply();
    }
  }

  return (
    <div className="space-y-3 pt-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {showHeaderRow && (
          <div>
            <label htmlFor={headerId} className="mb-1 block text-sm font-medium text-fg">
              Header row
            </label>
            <input
              id={headerId}
              ref={headerInputRef}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={headerRowText}
              onChange={(event) => onHeaderRowChange(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-invalid={headerRowError ? true : undefined}
              aria-describedby={headerRowError ? `${hintId} ${errorId}` : hintId}
              className={`w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light ${
                headerRowError ? "border-danger" : "border-line"
              }`}
            />
            <p id={hintId} className="mt-1 text-xs text-ink-soft">
              The row that holds your column names. Usually 1.
            </p>
            {headerRowError && (
              <p id={errorId} className="mt-1 text-xs text-danger">
                {headerRowError}
              </p>
            )}
          </div>
        )}

        {sheetNames.length > 1 && (
          <div>
            <span id={sheetLabelId} className="mb-1 block text-sm font-medium text-fg">
              Sheet
            </span>
            <Select
              ariaLabel="Sheet"
              value={sheetName ?? sheetNames[0]}
              options={sheetNames.map((name) => ({ value: name, label: name }))}
              onChange={onSheetChange}
            />
            <p className="mt-1 text-xs text-ink-soft">Which sheet of the workbook to read.</p>
          </div>
        )}
      </div>

      {showApply && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-60"
          >
            {applying && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {applyLabel}
          </button>
          <p className="text-xs text-ink-soft">Your file is read again with these settings. You don&apos;t need to choose it again.</p>
        </div>
      )}
    </div>
  );
}
