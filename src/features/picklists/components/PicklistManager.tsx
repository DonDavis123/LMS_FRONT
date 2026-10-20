"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Info, Plus, RefreshCw } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";
import { PicklistService } from "@/features/picklists/services/PicklistService";
import { invalidateLeadPicklists } from "@/features/picklists/hooks/useLeadPicklists";
import {
  PICKLIST_FIELDS,
  type LeadPicklistField,
  type PicklistOption,
} from "@/features/picklists/types/picklist.types";
import PicklistOptionRow from "@/features/picklists/components/PicklistOptionRow";
import DeletePicklistOptionDialog from "@/features/picklists/components/DeletePicklistOptionDialog";

type OptionsByField = Record<LeadPicklistField, PicklistOption[]>;

const EMPTY: OptionsByField = {
  lead_source: [],
  lead_status: [],
  industry: [],
  rating: [],
};

interface ToastState {
  kind: "success" | "error";
  message: string;
}

interface DeleteTarget {
  option: PicklistOption;
  usageCount: number;
}

function normalize(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(" ");
}

function sameText(a: string, b: string): boolean {
  return normalize(a).toLowerCase() === normalize(b).toLowerCase();
}

/** Moves one item; returns `null` when the move isn't allowed (built-in options stay put). */
function moveItem(list: PicklistOption[], from: number, to: number): PicklistOption[] | null {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return null;
  if (list[from].is_system || list[to].is_system) return null;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.every((option, index) => !option.is_system || list[index].id === option.id) ? next : null;
}

/**
 * Superadmin screen for the company's own Lead Source / Lead Status /
 * Industry / Rating options: add, rename, hide, delete and reorder.
 * Every change is saved straight away through /api/picklists/…
 */
export default function PicklistManager() {
  const [data, setData] = useState<OptionsByField>(EMPTY);
  const [activeField, setActiveField] = useState<LeadPicklistField>("lead_source");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [newValue, setNewValue] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [isReordering, setIsReordering] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const meta = PICKLIST_FIELDS.find((item) => item.field === activeField) ?? PICKLIST_FIELDS[0];
  const options = data[activeField];
  const activeCount = options.filter((option) => option.is_active).length;
  const hiddenCount = options.length - activeCount;

  // Loads every field at once, in the admin view (hidden options + usage counts).
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    PicklistService.getLeadPicklists(true)
      .then((fields) => {
        if (cancelled) return;
        const next: OptionsByField = { lead_source: [], lead_status: [], industry: [], rating: [] };
        for (const item of PICKLIST_FIELDS) {
          const match = fields.find((field) => field.field === item.field);
          next[item.field] = match ? [...match.options].sort((a, b) => a.sort_order - b.sort_order) : [];
        }
        setData(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(extractApiError(error, "Couldn't load the dropdown options from the server."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(kind: ToastState["kind"], message: string) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast({ kind, message });
    toastTimer.current = window.setTimeout(() => setToast(null), kind === "error" ? 5000 : 3000);
  }

  function patchField(field: LeadPicklistField, update: (list: PicklistOption[]) => PicklistOption[]) {
    setData((prev) => ({ ...prev, [field]: update(prev[field]) }));
  }

  function setBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectField(field: LeadPicklistField) {
    if (field === activeField) return;
    setActiveField(field);
    setNewValue("");
    setAddError(null);
    setDragId(null);
    setOverId(null);
  }

  /* ── Add ─────────────────────────────────────────────────────────── */

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (isAdding) return;

    const field = activeField;
    const value = normalize(newValue);
    if (!value) {
      setAddError("Enter a name for the new option.");
      return;
    }
    if (options.some((option) => sameText(option.value, value))) {
      setAddError(`“${value}” already exists in ${meta.label}.`);
      return;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      const created = await PicklistService.createOption(field, value);
      patchField(field, (list) => [...list, created]);
      invalidateLeadPicklists();
      setNewValue("");
      showToast("success", `Added “${created.value}” to ${meta.label}`);
      addInputRef.current?.focus();
    } catch (error) {
      setAddError(extractApiError(error, "Couldn't add this option. Try again."));
    } finally {
      setIsAdding(false);
    }
  }

  /* ── Rename ──────────────────────────────────────────────────────── */

  async function handleRename(option: PicklistOption, value: string): Promise<string | null> {
    const field = activeField;
    if (options.some((other) => other.id !== option.id && sameText(other.value, value))) {
      return `“${value}” already exists in ${meta.label}.`;
    }

    try {
      const updated = await PicklistService.updateOption(option.id, { value });
      // The update response carries no usage count; renaming doesn't change it.
      patchField(field, (list) =>
        list.map((item) => (item.id === option.id ? { ...item, ...updated, usage_count: item.usage_count } : item)),
      );
      invalidateLeadPicklists();
      showToast("success", `Renamed to “${updated.value}”`);
      return null;
    } catch (error) {
      return extractApiError(error, "Couldn't rename this option. Try again.");
    }
  }

  /* ── Show / hide ─────────────────────────────────────────────────── */

  async function handleToggleActive(option: PicklistOption) {
    const field = activeField;
    setBusy(option.id, true);
    try {
      const updated = await PicklistService.updateOption(option.id, { is_active: !option.is_active });
      patchField(field, (list) =>
        list.map((item) => (item.id === option.id ? { ...item, ...updated, usage_count: item.usage_count } : item)),
      );
      invalidateLeadPicklists();
      showToast(
        "success",
        updated.is_active ? `“${updated.value}” is visible again` : `“${updated.value}” is now hidden from forms`,
      );
    } catch (error) {
      showToast("error", extractApiError(error, "Couldn't update this option. Try again."));
    } finally {
      setBusy(option.id, false);
    }
  }

  /* ── Delete ──────────────────────────────────────────────────────── */

  function requestDelete(option: PicklistOption) {
    setDeleteError(null);
    setDeleteTarget({ option, usageCount: option.usage_count ?? 0 });
  }

  async function handleConfirmDelete(replaceWith?: string) {
    if (!deleteTarget) return;
    const field = activeField;
    const { option } = deleteTarget;
    const replacement = replaceWith ? options.find((item) => item.id === replaceWith) : undefined;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await PicklistService.deleteOption(option.id, replaceWith);
      patchField(field, (list) =>
        list
          .filter((item) => item.id !== option.id)
          .map((item) =>
            item.id === replaceWith && item.usage_count !== null
              ? { ...item, usage_count: item.usage_count + result.records_updated }
              : item,
          ),
      );
      invalidateLeadPicklists();
      setDeleteTarget(null);
      showToast(
        "success",
        result.records_updated > 0 && replacement
          ? `Deleted “${option.value}” — ${result.records_updated} ${
              result.records_updated === 1 ? "lead" : "leads"
            } moved to “${replacement.value}”`
          : `Deleted “${option.value}”`,
      );
    } catch (error) {
      const response = (
        error as { response?: { status?: number; data?: { code?: string; usage_count?: number } } } | null
      )?.response;
      if (response?.status === 409 && response.data?.code === "OPTION_IN_USE") {
        // Leads started using it since this screen loaded — ask for a replacement now.
        const count = response.data.usage_count ?? 1;
        setDeleteTarget({ option, usageCount: count });
        patchField(field, (list) => list.map((item) => (item.id === option.id ? { ...item, usage_count: count } : item)));
        setDeleteError(null);
      } else {
        setDeleteError(extractApiError(error, "Couldn't delete this option. Try again."));
      }
    } finally {
      setIsDeleting(false);
    }
  }

  /* ── Reorder ─────────────────────────────────────────────────────── */

  async function persistOrder(field: LeadPicklistField, next: PicklistOption[], previous: PicklistOption[]) {
    // Show the new order immediately; roll back if the server refuses it.
    patchField(field, () => next.map((option, index) => ({ ...option, sort_order: index })));
    setIsReordering(true);
    try {
      await PicklistService.reorderOptions(
        field,
        next.map((option) => option.id),
      );
      invalidateLeadPicklists();
    } catch (error) {
      patchField(field, () => previous);
      showToast("error", extractApiError(error, "Couldn't save the new order. Try again."));
    } finally {
      setIsReordering(false);
    }
  }

  function handleMove(option: PicklistOption, direction: -1 | 1) {
    if (isReordering) return;
    const from = options.findIndex((item) => item.id === option.id);
    const next = moveItem(options, from, from + direction);
    if (next) void persistOrder(activeField, next, options);
  }

  function handleDrop(target: PicklistOption) {
    const sourceId = dragId;
    setDragId(null);
    setOverId(null);
    if (!sourceId || sourceId === target.id || isReordering) return;
    const from = options.findIndex((item) => item.id === sourceId);
    const to = options.findIndex((item) => item.id === target.id);
    const next = moveItem(options, from, to);
    if (next) void persistOrder(activeField, next, options);
  }

  const replacements = useMemo(
    () => (deleteTarget ? options.filter((item) => item.is_active && item.id !== deleteTarget.option.id) : []),
    [options, deleteTarget],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="lp-card overflow-hidden">
        {/* Header */}
        <div className="border-b border-line bg-surface px-4 py-3">
          <h1 className="font-serif text-lg leading-tight text-fg">Dropdown Options</h1>
          <p className="text-xs text-ink-soft">
            Customise the choices your team sees on leads. These lists belong to your company only.
          </p>
        </div>

        <div className="grid lg:grid-cols-[14rem_minmax(0,1fr)]">
          {/* Field switcher */}
          <nav
            aria-label="Dropdown fields"
            className="flex gap-1.5 overflow-x-auto border-b border-line bg-paper/50 p-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:border-r lg:p-3"
          >
            {PICKLIST_FIELDS.map((item) => {
              const list = data[item.field];
              const isActive = item.field === activeField;
              return (
                <button
                  key={item.field}
                  type="button"
                  onClick={() => selectField(item.field)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-slate lg:w-full ${
                    isActive
                      ? "bg-surface font-semibold text-fg shadow-sm ring-1 ring-line lg:shadow-[inset_2px_0_0_var(--color-amber)]"
                      : "font-medium text-ink-soft hover:bg-surface hover:text-fg"
                  }`}
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                  {!isLoading && !loadError && (
                    <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                      {list.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Options panel */}
          <section aria-labelledby="picklist-panel-title" className="min-w-0">
            <div className="border-b border-line px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 id="picklist-panel-title" className="text-base font-semibold text-fg">
                  {meta.label}
                </h2>
                {!isLoading && !loadError && (
                  <p className="text-xs text-ink-soft">
                    {activeCount} visible{hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ""}
                  </p>
                )}
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">{meta.description}</p>

              {/* Add */}
              {!isLoading && !loadError && (
                <form onSubmit={handleAdd} className="mt-3" noValidate>
                  <div className="flex gap-2">
                    <input
                      ref={addInputRef}
                      value={newValue}
                      onChange={(event) => {
                        setNewValue(event.target.value);
                        if (addError) setAddError(null);
                      }}
                      maxLength={meta.maxLength}
                      placeholder={`Add a new ${meta.label.toLowerCase()} option`}
                      aria-label={`New ${meta.label} option`}
                      aria-invalid={addError ? true : undefined}
                      disabled={isAdding}
                      className={`min-w-0 flex-1 rounded-md border bg-surface px-3 py-2 text-base text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light disabled:opacity-60 sm:text-sm ${
                        addError ? "border-danger" : "border-line"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isAdding || !newValue.trim()}
                      className="flex shrink-0 items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
                    >
                      {isAdding ? (
                        <Spinner size="sm" className="border-white/30 border-t-white" />
                      ) : (
                        <Plus size={16} />
                      )}
                      Add
                    </button>
                  </div>
                  {addError && (
                    <p role="alert" className="mt-1.5 text-xs text-danger">
                      {addError}
                    </p>
                  )}
                </form>
              )}
            </div>

            {loadError ? (
              <div className="flex items-center justify-between gap-3 bg-danger-soft px-4 py-3 text-sm text-danger">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((value) => value + 1)}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1 text-xs font-semibold transition hover:bg-surface"
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <OptionsSkeleton />
            ) : (
              <>
                <ul aria-label={`${meta.label} options`}>
                  {options.map((option, index) => (
                    <PicklistOptionRow
                      key={option.id}
                      option={option}
                      isBusy={busyIds.has(option.id)}
                      isReorderLocked={isReordering}
                      canMoveUp={index > 0 && !options[index - 1].is_system}
                      canMoveDown={index < options.length - 1}
                      maxLength={meta.maxLength}
                      isDragging={dragId === option.id}
                      isDropTarget={dragId !== null && overId === option.id && dragId !== option.id}
                      onRename={handleRename}
                      onToggleActive={handleToggleActive}
                      onDelete={requestDelete}
                      onMove={handleMove}
                      onDragStart={(item) => setDragId(item.id)}
                      onDragOver={(item) => {
                        if (dragId && !item.is_system) setOverId(item.id);
                      }}
                      onDrop={handleDrop}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverId(null);
                      }}
                    />
                  ))}
                  {options.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-ink-soft">No options yet. Add the first one above.</li>
                  )}
                </ul>

                <div className="flex items-start gap-2 border-t border-line bg-paper/50 px-4 py-3 text-xs text-ink-soft">
                  <Info size={14} className="mt-px shrink-0" />
                  <p>
                    Drag the handle or use the arrows to reorder — the order is the one your team sees. Hidden options
                    disappear from forms and filters, but leads that already use them keep their value. Every change is
                    saved automatically.
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <DeletePicklistOptionDialog
        option={deleteTarget?.option ?? null}
        fieldLabel={meta.label}
        usageCount={deleteTarget?.usageCount ?? 0}
        replacements={replacements}
        isBusy={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />

      <div aria-live="polite" role="status">
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-[60] flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium shadow-lg animate-toast-in ${
              toast.kind === "success"
                ? "border-success/30 bg-success-soft text-success"
                : "border-danger/30 bg-danger-soft text-danger"
            }`}
          >
            {toast.kind === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 animate-pop-in" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

function OptionsSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
          <span className="h-4 w-4 rounded bg-paper" />
          <span className="h-4 rounded bg-paper" style={{ width: `${40 + ((index * 17) % 35)}%` }} />
        </div>
      ))}
    </div>
  );
}
