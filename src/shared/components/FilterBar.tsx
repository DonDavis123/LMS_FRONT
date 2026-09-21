"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ListFilter, Plus, SlidersHorizontal, X } from "lucide-react";

export type FilterFieldType = "text" | "choice" | "number" | "boolean" | "date" | "datetime" | "uuid";

export interface FilterFieldOption {
  value: string;
  label: string;
}

export interface FilterFieldConfig {
  /** Backend/data field name — never the UI label. */
  field: string;
  label: string;
  type: FilterFieldType;
  /** Known values for "choice" fields, or a pre-loaded id→label list for a "uuid" field (e.g. owners). */
  choices?: FilterFieldOption[];
}

export interface FilterCondition {
  field: string;
  operator: string;
  value: unknown;
}

interface FilterBarProps {
  fields: FilterFieldConfig[];
  filters: FilterCondition[];
  onChange: (filters: FilterCondition[]) => void;
}

const OPERATORS_BY_TYPE: Record<FilterFieldType, { value: string; label: string }[]> = {
  text: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "is" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
    { value: "not_contains", label: "doesn't contain" },
    { value: "not_equals", label: "is not" },
  ],
  choice: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "in", label: "is any of" },
    { value: "not_in", label: "is none of" },
  ],
  uuid: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "in", label: "is any of" },
    { value: "not_in", label: "is none of" },
  ],
  number: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
    { value: "after", label: "is at least" },
    { value: "before", label: "is at most" },
    { value: "in", label: "is any of" },
    { value: "not_in", label: "is none of" },
  ],
  boolean: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
  ],
  date: [
    { value: "equals", label: "is" },
    { value: "after", label: "on/after" },
    { value: "before", label: "on/before" },
    { value: "between", label: "between" },
  ],
  datetime: [
    { value: "equals", label: "is" },
    { value: "after", label: "on/after" },
    { value: "before", label: "on/before" },
    { value: "between", label: "between" },
  ],
};

function toApiDatetime(localValue: string): string {
  return localValue ? new Date(localValue).toISOString() : localValue;
}

function describeFilter(condition: FilterCondition, fields: FilterFieldConfig[]): string {
  const config = fields.find((f) => f.field === condition.field);
  const label = config?.label ?? condition.field;
  const opLabel =
    OPERATORS_BY_TYPE[config?.type ?? "text"].find((o) => o.value === condition.operator)?.label ??
    condition.operator;

  let valueLabel: string;
  if (condition.operator === "between" && condition.value && typeof condition.value === "object") {
    const { from, to } = condition.value as { from?: string; to?: string };
    valueLabel = `${from ?? "?"} – ${to ?? "?"}`;
  } else if (Array.isArray(condition.value)) {
    valueLabel = condition.value
      .map((v) => config?.choices?.find((c) => c.value === String(v))?.label ?? String(v))
      .join(", ");
  } else if ((config?.type === "choice" || config?.type === "uuid") && config.choices) {
    valueLabel = config.choices.find((c) => c.value === condition.value)?.label ?? String(condition.value);
  } else if (typeof condition.value === "boolean") {
    valueLabel = condition.value ? "Yes" : "No";
  } else {
    valueLabel = String(condition.value);
  }

  return `${label} ${opLabel} ${valueLabel}`;
}

/**
 * Field / operator / value filter builder. The popover is rendered through
 * a portal into `document.body` and positioned with `fixed` coordinates
 * taken from the trigger button's own bounding rect — the same technique
 * `RecordActionsMenu` uses for the row 3-dot menu — so it always floats
 * fully on top of the page instead of being cropped by a table's
 * `overflow-x-auto` wrapper or a scrolling container.
 */
export default function FilterBar({ fields, filters, onChange }: FilterBarProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const [draftField, setDraftField] = useState(fields[0]?.field ?? "");
  const [draftOperator, setDraftOperator] = useState(
    OPERATORS_BY_TYPE[fields[0]?.type ?? "text"][0]?.value ?? "contains"
  );
  const [draftValue, setDraftValue] = useState("");
  const [draftValues, setDraftValues] = useState<string[]>([]);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const draftConfig = fields.find((f) => f.field === draftField) ?? fields[0];
  const draftOperators = OPERATORS_BY_TYPE[draftConfig?.type ?? "text"];

  function reposition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 304;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - popoverWidth - 8);
    const top = rect.bottom + 8;
    setPosition({ top, left });
  }

  useEffect(() => {
    if (!isOpen) return;
    reposition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen]);

  function resetDraft(nextField?: string) {
    const config = fields.find((f) => f.field === (nextField ?? fields[0]?.field)) ?? fields[0];
    setDraftField(config?.field ?? "");
    setDraftOperator(OPERATORS_BY_TYPE[config?.type ?? "text"][0]?.value ?? "contains");
    setDraftValue("");
    setDraftValues([]);
    setDraftFrom("");
    setDraftTo("");
  }

  function handleToggle() {
    if (!isOpen) resetDraft();
    setIsOpen((v) => !v);
  }

  function handleAdd() {
    if (!draftConfig) return;
    const isDatetime = draftConfig.type === "datetime";
    let value: unknown;

    if (draftOperator === "between") {
      if (!draftFrom || !draftTo) return;
      value = {
        from: isDatetime ? toApiDatetime(draftFrom) : draftFrom,
        to: isDatetime ? toApiDatetime(draftTo) : draftTo,
      };
    } else if (draftOperator === "in" || draftOperator === "not_in") {
      if (draftValues.length === 0) return;
      value = draftConfig.type === "number" ? draftValues.map(Number) : draftValues;
    } else if (draftConfig.type === "boolean") {
      value = draftValue !== "false";
    } else if (draftConfig.type === "number") {
      if (draftValue === "") return;
      value = Number(draftValue);
    } else if (isDatetime) {
      if (!draftValue) return;
      value = toApiDatetime(draftValue);
    } else {
      if (draftValue.trim() === "") return;
      value = draftValue.trim();
    }

    onChange([
      ...filters.filter((f) => f.field !== draftConfig.field),
      { field: draftConfig.field, operator: draftOperator, value },
    ]);
    setIsOpen(false);
    resetDraft();
  }

  function handleRemove(field: string) {
    onChange(filters.filter((f) => f.field !== field));
  }

  if (fields.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.length > 0 && (
        <span className="flex items-center gap-1 pr-0.5 text-ink-soft">
          <ListFilter size={14} />
        </span>
      )}

      {filters.map((condition) => (
        <span
          key={condition.field}
          className="group flex items-center gap-1.5 rounded-full border border-slate-light bg-slate-light/60 px-3 py-1.5 text-xs font-medium text-slate shadow-sm transition hover:border-slate/40"
        >
          {describeFilter(condition, fields)}
          <button
            onClick={() => handleRemove(condition.field)}
            aria-label={`Remove ${condition.field} filter`}
            className="rounded-full p-0.5 text-slate/70 transition hover:bg-surface hover:text-danger"
          >
            <X size={12} />
          </button>
        </span>
      ))}

      {filters.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="rounded-full px-2 py-1 text-xs font-medium text-ink-soft transition hover:text-danger"
        >
          Clear all
        </button>
      )}

      <button
        ref={triggerRef}
        onClick={handleToggle}
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          isOpen
            ? "border-ink bg-ink text-white shadow-sm"
            : "border-dashed border-line text-ink-soft hover:border-slate hover:text-slate"
        }`}
      >
        <SlidersHorizontal size={13} />
        Add filter
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              style={{ top: position.top, left: position.left }}
              className="fixed z-[100] w-[304px] animate-menu-in rounded-xl border border-line bg-surface p-4 shadow-2xl ring-1 ring-black/5"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-fg">Add filter</p>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="rounded-md p-1 text-ink-soft hover:bg-paper hover:text-fg"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2.5">
                <FieldSelect
                  label="Field"
                  value={draftField}
                  onChange={(value) => resetDraft(value)}
                  options={fields.map((f) => ({ value: f.field, label: f.label }))}
                />

                <FieldSelect
                  label="Condition"
                  value={draftOperator}
                  onChange={setDraftOperator}
                  options={draftOperators}
                />

                <div>
                  <p className="mb-1 text-xs font-medium text-ink-soft">Value</p>
                  <FilterValueInput
                    config={draftConfig}
                    operator={draftOperator}
                    value={draftValue}
                    values={draftValues}
                    from={draftFrom}
                    to={draftTo}
                    onValueChange={setDraftValue}
                    onValuesChange={setDraftValues}
                    onFromChange={setDraftFrom}
                    onToChange={setDraftTo}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-paper"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1 rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ink-2 active:scale-[0.98]"
                >
                  <Plus size={13} /> Apply
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-fg outline-none transition focus:border-slate focus:bg-surface focus:ring-2 focus:ring-slate-light"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterValueInput({
  config,
  operator,
  value,
  values,
  from,
  to,
  onValueChange,
  onValuesChange,
  onFromChange,
  onToChange,
}: {
  config?: FilterFieldConfig;
  operator: string;
  value: string;
  values: string[];
  from: string;
  to: string;
  onValueChange: (v: string) => void;
  onValuesChange: (v: string[]) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  if (!config) return null;
  const inputClass =
    "w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-fg outline-none transition focus:border-slate focus:bg-surface focus:ring-2 focus:ring-slate-light";
  const dateInputType = config.type === "datetime" ? "datetime-local" : "date";

  if (operator === "between") {
    return (
      <div className="flex items-center gap-2">
        <input type={dateInputType} value={from} onChange={(e) => onFromChange(e.target.value)} className={inputClass} />
        <span className="text-xs text-ink-soft">to</span>
        <input type={dateInputType} value={to} onChange={(e) => onToChange(e.target.value)} className={inputClass} />
      </div>
    );
  }

  if (operator === "in" || operator === "not_in") {
    if (config.choices) {
      return (
        <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-line bg-paper p-2">
          {config.choices.map((choice) => (
            <label key={choice.value} className="flex items-center gap-2 rounded px-1 py-1 text-sm text-fg hover:bg-surface">
              <input
                type="checkbox"
                checked={values.includes(choice.value)}
                onChange={(e) =>
                  onValuesChange(
                    e.target.checked ? [...values, choice.value] : values.filter((v) => v !== choice.value)
                  )
                }
                className="rounded border-line accent-ink"
              />
              {choice.label}
            </label>
          ))}
        </div>
      );
    }
    return (
      <input
        value={values.join(", ")}
        onChange={(e) => onValuesChange(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
        placeholder="Comma-separated values"
        className={inputClass}
      />
    );
  }

  if (config.type === "boolean") {
    return (
      <select value={value || "true"} onChange={(e) => onValueChange(e.target.value)} className={inputClass}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if ((config.type === "choice" || config.type === "uuid") && config.choices) {
    return (
      <select value={value} onChange={(e) => onValueChange(e.target.value)} className={inputClass}>
        <option value="">Select…</option>
        {config.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    );
  }

  if (config.type === "number") {
    return <input type="number" value={value} onChange={(e) => onValueChange(e.target.value)} className={inputClass} />;
  }

  if (config.type === "date" || config.type === "datetime") {
    return <input type={dateInputType} value={value} onChange={(e) => onValueChange(e.target.value)} className={inputClass} />;
  }

  return (
    <input
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={config.type === "uuid" ? "UUID" : "Value"}
      className={inputClass}
    />
  );
}
