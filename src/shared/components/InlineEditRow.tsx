"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

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
    <div className={`group relative rounded-md px-2 py-2 -mx-2 hover:bg-paper ${fullWidth ? "sm:col-span-2" : ""}`}>
      <p className="text-xs text-ink-soft">{label}</p>
      {!editing ? (
        <div className="flex min-h-7 items-center justify-between gap-2">
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-fg">
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
        <div className="mt-1 flex items-start gap-2">
          {type === "textarea" ? (
            <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} className={editClass + " min-h-20 resize-y"} />
          ) : type === "select" ? (
            <select autoFocus value={draft} onChange={e => setDraft(e.target.value)} className={editClass}>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input autoFocus type={type} value={draft} onChange={e => setDraft(e.target.value)} className={editClass} />
          )}
          <button type="button" disabled={saving} onClick={save} className="rounded-md bg-ink p-2 text-white hover:bg-ink-2 disabled:opacity-50"><Check size={14}/></button>
          <button type="button" disabled={saving} onClick={cancel} className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper disabled:opacity-50"><X size={14}/></button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">Couldn't save. Try again.</p>}
    </div>
  );
}

const editClass = "min-w-0 flex-1 rounded-md border border-slate bg-surface px-2.5 py-2 text-sm text-fg outline-none focus:ring-2 focus:ring-slate-light";
