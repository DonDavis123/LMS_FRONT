"use client";

import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import FloatingPopover from "@/shared/components/FloatingPopover";
import Spinner from "@/shared/components/Spinner";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { ImportFileFormat } from "@/features/leadImport/types/leadImport.types";
import { saveBlob } from "@/features/leadImport/utils/download";
import { getImportError } from "@/features/leadImport/utils/importErrors";

interface TemplateMenuProps {
  /** Called with a plain-English message when the download fails (show it as a toast). */
  onError: (message: string) => void;
}

const FORMATS: ReadonlyArray<{ format: ImportFileFormat; label: string; hint: string; Icon: typeof FileText }> = [
  { format: "csv", label: "CSV", hint: ".csv", Icon: FileText },
  { format: "xlsx", label: "Excel", hint: ".xlsx", Icon: FileSpreadsheet },
];

export default function TemplateMenu({ onError }: TemplateMenuProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<ImportFileFormat | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    anchorRef.current?.focus();
  }, []);

  // Move focus into the menu when it opens so it works from the keyboard.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => listRef.current?.querySelector<HTMLElement>("button")?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function download(format: ImportFileFormat) {
    setOpen(false);
    setDownloading(format);
    try {
      const { blob, fileName } = await LeadImportService.downloadTemplate(format);
      saveBlob(blob, fileName);
    } catch (error) {
      const info = getImportError(error);
      onError(`Couldn't download the template. ${info.message}`);
    } finally {
      setDownloading(null);
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>("button") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  const busy = downloading !== null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Spinner size="sm" /> : <Download size={14} aria-hidden="true" />}
        {busy ? "Downloading..." : "Download template"}
        {!busy && <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />}
      </button>

      {open && (
        <FloatingPopover anchorRef={anchorRef} onClose={close} width={200} ariaLabel="Template format">
          <div ref={listRef} onKeyDown={handleListKeyDown} className="-m-2 space-y-0.5">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Format</p>
            {FORMATS.map(({ format, label, hint, Icon }) => (
              <button
                key={format}
                type="button"
                onClick={() => download(format)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-fg outline-none transition hover:bg-paper focus-visible:bg-paper focus-visible:ring-2 focus-visible:ring-amber"
              >
                <Icon size={15} className="shrink-0 text-slate" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                <span className="text-xs text-ink-soft">{hint}</span>
              </button>
            ))}
          </div>
        </FloatingPopover>
      )}
    </>
  );
}
