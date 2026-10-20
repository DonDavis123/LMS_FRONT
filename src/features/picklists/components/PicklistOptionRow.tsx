"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Check, ChevronDown, ChevronUp, GripVertical, Lock, Pencil, Trash2, X } from "lucide-react";
import Switch from "@/shared/components/Switch";
import Spinner from "@/shared/components/Spinner";
import type { PicklistOption } from "@/features/picklists/types/picklist.types";

interface PicklistOptionRowProps {
  option: PicklistOption;
  /** A save for this row is in flight. */
  isBusy: boolean;
  /** Another reorder is being saved, so moving is paused. */
  isReorderLocked: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  maxLength: number;
  isDragging: boolean;
  isDropTarget: boolean;
  /** Resolves to an error message, or `null` once the rename was saved. */
  onRename: (option: PicklistOption, value: string) => Promise<string | null>;
  onToggleActive: (option: PicklistOption) => void;
  onDelete: (option: PicklistOption) => void;
  onMove: (option: PicklistOption, direction: -1 | 1) => void;
  onDragStart: (option: PicklistOption) => void;
  onDragOver: (option: PicklistOption) => void;
  onDrop: (option: PicklistOption) => void;
  onDragEnd: () => void;
}

const iconBase =
  "grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-soft outline-none transition focus-visible:ring-2 focus-visible:ring-slate disabled:cursor-not-allowed disabled:opacity-35";
const iconButton = `${iconBase} enabled:hover:bg-paper enabled:hover:text-fg`;
const iconButtonDanger = `${iconBase} enabled:hover:bg-danger-soft enabled:hover:text-danger`;

function usageLabel(count: number): string {
  if (count === 0) return "Not used";
  return `${count} ${count === 1 ? "lead" : "leads"}`;
}

export default function PicklistOptionRow({
  option,
  isBusy,
  isReorderLocked,
  canMoveUp,
  canMoveDown,
  maxLength,
  isDragging,
  isDropTarget,
  onRename,
  onToggleActive,
  onDelete,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: PicklistOptionRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(option.value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const usage = option.usage_count;
  const locked = option.is_system;
  const canDrag = !locked && !isEditing && !isBusy && !isReorderLocked;

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  function startEditing() {
    setDraft(option.value);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;

    const next = draft.split(/\s+/).filter(Boolean).join(" ");
    if (next === option.value) {
      cancelEditing();
      return;
    }
    if (!next) {
      setError("Enter a name for this option.");
      return;
    }

    setIsSaving(true);
    const message = await onRename(option, next);
    setIsSaving(false);
    if (message) {
      setError(message);
      return;
    }
    setIsEditing(false);
    setError(null);
  }

  function handleDragStart(event: DragEvent<HTMLLIElement>) {
    if (!canDrag) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    // Firefox only starts a drag when some data is set.
    event.dataTransfer.setData("text/plain", option.id);
    onDragStart(option);
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onDragOver(option);
  }

  function handleDrop(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    onDrop(option);
  }

  return (
    <li
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      className={`group border-b border-line px-3 py-2 last:border-0 sm:px-4 ${
        isDragging ? "opacity-40" : ""
      } ${isDropTarget ? "shadow-[inset_0_2px_0_var(--color-amber)]" : ""} ${
        !option.is_active ? "bg-paper/60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {/* Drag handle / lock */}
        <span
          aria-hidden="true"
          className={`grid h-8 w-6 shrink-0 place-items-center ${
            locked
              ? "text-ink-soft"
              : canDrag
                ? "cursor-grab text-ink-soft active:cursor-grabbing"
                : "text-ink-soft/40"
          }`}
        >
          {locked ? <Lock size={14} /> : <GripVertical size={16} />}
        </span>

        {/* Name / rename form */}
        <div className="min-w-0 flex-1 basis-40">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelEditing();
                  }
                }}
                maxLength={maxLength}
                aria-label={`Rename ${option.value}`}
                aria-invalid={error ? true : undefined}
                disabled={isSaving}
                className={`min-w-0 flex-1 rounded-md border bg-surface px-2.5 py-1.5 text-base text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light disabled:opacity-60 sm:text-sm ${
                  error ? "border-danger" : "border-line"
                }`}
              />
              <button
                type="submit"
                disabled={isSaving}
                aria-label="Save name"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink text-white outline-none transition hover:bg-ink-2 focus-visible:ring-2 focus-visible:ring-slate disabled:opacity-60"
              >
                {isSaving ? <Spinner size="sm" className="border-white/30 border-t-white" /> : <Check size={15} />}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                aria-label="Cancel rename"
                className={iconButton}
              >
                <X size={15} />
              </button>
            </form>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`min-w-0 truncate text-sm font-medium ${
                  option.is_active ? "text-fg" : "text-ink-soft line-through decoration-ink-soft/40"
                }`}
                title={option.value}
              >
                {option.value}
              </span>
              {locked && (
                <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  Built-in
                </span>
              )}
              {!option.is_active && (
                <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-dark">
                  Hidden
                </span>
              )}
              {usage !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    usage > 0 ? "bg-slate-light text-slate" : "text-ink-soft"
                  }`}
                >
                  {usageLabel(usage)}
                </span>
              )}
            </div>
          )}

          {isEditing && error && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {error}
            </p>
          )}
          {isEditing && !error && usage !== null && usage > 0 && (
            <p className="mt-1 text-xs text-ink-soft">
              {usage} {usage === 1 ? "lead uses" : "leads use"} this option and will be updated to the new name.
            </p>
          )}
        </div>

        {/* Actions */}
        {!locked && !isEditing && (
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            {/* Arrows are the touch-friendly (and keyboard) way to reorder — drag & drop doesn't work on phones. */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onMove(option, -1)}
                disabled={!canMoveUp || isReorderLocked || isBusy}
                aria-label={`Move ${option.value} up`}
                className={iconButton}
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => onMove(option, 1)}
                disabled={!canMoveDown || isReorderLocked || isBusy}
                aria-label={`Move ${option.value} down`}
                className={iconButton}
              >
                <ChevronDown size={16} />
              </button>
            </div>

            <Switch
              checked={option.is_active}
              onChange={() => onToggleActive(option)}
              loading={isBusy}
              ariaLabel={`${option.is_active ? "Hide" : "Show"} ${option.value}`}
            />

            <button
              type="button"
              onClick={startEditing}
              disabled={isBusy}
              aria-label={`Rename ${option.value}`}
              className={iconButton}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(option)}
              disabled={isBusy}
              aria-label={`Delete ${option.value}`}
              className={iconButtonDanger}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
