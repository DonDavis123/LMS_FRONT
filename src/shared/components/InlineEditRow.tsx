"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import ModernStatusSelect from "@/shared/components/ModernStatusSelect";

export interface InlineEditOption { value: string; label: string }

interface InlineEditRowProps {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
  type?: "text" | "date" | "datetime-local" | "number" | "textarea" | "select";
  options?: InlineEditOption[];
  editable?: boolean;
  displayValue?: string;
  onSave?: (value: string) => Promise<void>;
}

export default function InlineEditRow({
  label, value, fullWidth = false, type = "text", options = [], editable = true, displayValue, onSave,
}: InlineEditRowProps) {
  const normalized = value === null || value === undefined ? "" : String(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(normalized);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => { if (!editing) setDraft(normalized); }, [normalized, editing]);

  async function save() {
    if (!onSave) return setEditing(false);

    // Preserve the user's position in the detail page. Updating the parent
    // record can cause a rerender and, depending on the focused control, the
    // browser may otherwise jump back to the top of the page.
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    setSaving(true);
    setError(false);

    try {
      await onSave(draft);
      setEditing(false);

      // Restore after React has committed the updated record. Blurring the
      // button also prevents browser focus restoration from moving the page.
      (document.activeElement as HTMLElement | null)?.blur();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      });
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function cancel() { setDraft(normalized); setError(false); setEditing(false); }

  return (
    <div className={`group relative min-w-0 overflow-hidden rounded-xl border border-transparent px-3 py-2.5 -mx-1.5 transition-all duration-200 hover:border-line hover:bg-paper/70 ${editing ? "border-line bg-paper/80 shadow-sm" : ""} ${fullWidth ? "sm:col-span-2" : ""}`}>
      <p className="text-xs text-ink-soft">{label}</p>
      {!editing ? (
        <div className="flex min-h-7 items-center justify-between gap-2">
          <p className="min-w-0 max-w-full flex-1 whitespace-pre-wrap break-words text-sm text-fg">
            {displayValue ?? (normalized.trim() ? normalized : "—")}
          </p>
          {editable && onSave && (
            <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${label}`}
              className="shrink-0 rounded p-1 text-ink-soft opacity-0 transition hover:bg-line hover:text-fg group-hover:opacity-100 focus:opacity-100">
              <Pencil size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 flex min-w-0 max-w-full items-start gap-2 animate-inline-edit">
          {type === "textarea" ? (
            <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} className={editClass + " min-h-20 resize-y"} />
          ) : type === "select" ? (
            <div className="min-w-0 flex-1">
              <ModernStatusSelect
                value={draft}
                fullWidth
                onChange={setDraft}
                options={options.map((option) => ({
                  value: option.value,
                  label: option.label,
                  tone: /completed|contacted|qualified/i.test(option.label) ? "success" : /lost|junk|not qualified|waiting/i.test(option.label) ? "danger" : /progress|future|attempted|deferred/i.test(option.label) ? "warning" : "neutral",
                }))}
              />
            </div>
          ) : (
            <input autoFocus type={type} value={draft} onChange={e => setDraft(e.target.value)} className={editClass} />
          )}
          <button type="button" disabled={saving} onClick={save} aria-label={`Save ${label}`} className="shrink-0 rounded-lg bg-ink p-2 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-ink-2 hover:shadow-md active:scale-95 disabled:opacity-50"><Check size={14}/></button>
          <button type="button" disabled={saving} onClick={cancel} aria-label={`Cancel editing ${label}`} className="shrink-0 rounded-lg border border-line bg-surface p-2 text-ink-soft shadow-sm transition-all hover:-translate-y-0.5 hover:bg-paper hover:text-fg active:scale-95 disabled:opacity-50"><X size={14}/></button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">Couldn&apos;t save. Try again.</p>}
    </div>
  );
}

const editClass = "min-w-0 w-full max-w-full flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg shadow-inner outline-none transition-all duration-200 focus:border-slate focus:ring-4 focus:ring-slate-light/50";
