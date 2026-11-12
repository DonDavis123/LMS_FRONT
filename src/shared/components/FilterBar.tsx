"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ListFilter, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import DateInput, { DateTimeInput } from "@/shared/components/DateInput";
import { formatLocalDateTime } from "@/shared/utils/dateTime";

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

const POPOVER_WIDTH = 384;

function toApiDatetime(localValue: string): string {
  return localValue ? new Date(localValue).toISOString() : localValue;
}

function formatDateValue(value: string, type?: FilterFieldType): string {
  if (!value) return "?";
  if (type === "datetime") return formatLocalDateTime(value) || value;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
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
    valueLabel = `${formatDateValue(from ?? "", config?.type)} – ${formatDateValue(to ?? "", config?.type)}`;
  } else if (Array.isArray(condition.value)) {
    valueLabel = condition.value
      .map((v) => config?.choices?.find((c) => c.value === String(v))?.label ?? String(v))
      .join(", ");
  } else if ((config?.type === "choice" || config?.type === "uuid") && config.choices) {
    valueLabel = config.choices.find((c) => c.value === condition.value)?.label ?? String(condition.value);
  } else if (typeof condition.value === "boolean") {
    valueLabel = condition.value ? "Yes" : "No";
  } else if (config?.type === "date" || config?.type === "datetime") {
    valueLabel = formatDateValue(String(condition.value), config.type);
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
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 560 });

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
    const popoverWidth = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - popoverWidth - 8);
    const top = rect.bottom + 8;
    setPosition({ top, left, maxHeight: Math.max(280, window.innerHeight - top - 12) });
  }

  useEffect(() => {
    if (!isOpen) return;
    reposition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      // Calendar / time popovers are portaled separately; clicks there are not "outside".
      if (target instanceof Element && target.closest("[data-floating-popover]")) return;
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

  /** Returns the value to submit for the current draft, or undefined while it is incomplete. */
  function buildValue(): unknown {
    if (!draftConfig) return undefined;
    const isDatetime = draftConfig.type === "datetime";

    if (draftOperator === "between") {
      if (!draftFrom || !draftTo) return undefined;
      return {
        from: isDatetime ? toApiDatetime(draftFrom) : draftFrom,
        to: isDatetime ? toApiDatetime(draftTo) : draftTo,
      };
    }
    if (draftOperator === "in" || draftOperator === "not_in") {
      if (draftValues.length === 0) return undefined;
      return draftConfig.type === "number" ? draftValues.map(Number) : draftValues;
    }
    if (draftConfig.type === "boolean") return draftValue !== "false";
    if (draftConfig.type === "number") return draftValue === "" ? undefined : Number(draftValue);
    if (isDatetime) return draftValue ? toApiDatetime(draftValue) : undefined;
    return draftValue.trim() === "" ? undefined : draftValue.trim();
  }

  const canApply = buildValue() !== undefined;

  function handleAdd() {
    if (!draftConfig) return;
    const value = buildValue();
    if (value === undefined) return;

    onChange([
      ...filters.filter((f) => f.field !== draftConfig.field),
      { field: draftConfig.field, operator: draftOperator, value },
    ]);
    setIsOpen(false);
    resetDraft();
  }

  function handleOperatorChange(next: string) {
    setDraftOperator(next);
    // Single-value and multi-value pickers use different state, so start clean.
    setDraftValue("");
    setDraftValues([]);
    setDraftFrom("");
    setDraftTo("");
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
              style={{ top: position.top, left: position.left, maxHeight: position.maxHeight, width: POPOVER_WIDTH }}
              className="fixed z-[100] flex max-w-[calc(100vw-16px)] animate-menu-in flex-col rounded-xl border border-line bg-surface shadow-2xl ring-1 ring-black/5"
            >
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <p className="text-sm font-semibold text-fg">Add filter</p>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                  className="rounded-md p-1 text-ink-soft hover:bg-paper hover:text-fg"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-3 pt-1">
                <Section label="Field">
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Field">
                    {fields.map((f) => (
                      <Chip key={f.field} selected={f.field === draftField} onClick={() => resetDraft(f.field)}>
                        {f.label}
                      </Chip>
                    ))}
                  </div>
                </Section>

                <Section label="Condition">
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Condition">
                    {draftOperators.map((op) => (
                      <Chip key={op.value} selected={op.value === draftOperator} onClick={() => handleOperatorChange(op.value)}>
                        {op.label}
                      </Chip>
                    ))}
                  </div>
                </Section>

                <Section label="Value">
                  <FilterValueInput
                    key={`${draftField}:${draftOperator}`}
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
                    onSubmit={handleAdd}
                  />
                </Section>
              </div>

              <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-paper"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!canApply}
                  className="flex items-center gap-1 rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ink-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
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

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-soft">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Multi-select chips show a check mark when selected. */
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] ${
        selected
          ? "border-ink bg-ink text-white shadow-sm"
          : "border-line bg-paper text-fg hover:border-slate hover:bg-surface"
      }`}
    >
      {multi && selected && <Check size={12} />}
      {children}
    </button>
  );
}

/** Chip picker for known choices — single or multi-select, with search once the list gets long. */
function ChoicePicker({
  choices,
  multi,
  value,
  values,
  onValueChange,
  onValuesChange,
}: {
  choices: FilterFieldOption[];
  multi: boolean;
  value: string;
  values: string[];
  onValueChange: (v: string) => void;
  onValuesChange: (v: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const searchable = choices.length > 8;
  const visible = query.trim()
    ? choices.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()))
    : choices;

  return (
    <div className="space-y-2">
      {searchable && (
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-line bg-paper py-1.5 pl-8 pr-2.5 text-sm text-fg outline-none transition focus:border-slate focus:bg-surface focus:ring-2 focus:ring-slate-light"
          />
        </div>
      )}

      {multi && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-soft">{values.length} selected</span>
          <span className="flex gap-3">
            <button
              type="button"
              onClick={() => onValuesChange(Array.from(new Set([...values, ...visible.map((c) => c.value)])))}
              className="font-medium text-slate hover:underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onValuesChange([])}
              disabled={values.length === 0}
              className="font-medium text-ink-soft hover:text-danger disabled:opacity-40"
            >
              Clear
            </button>
          </span>
        </div>
      )}

      <div
        className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto"
        role={multi ? "group" : "radiogroup"}
        aria-label="Filter value"
      >
        {visible.length === 0 ? (
          <p className="py-1 text-xs text-ink-soft">No matches</p>
        ) : (
          visible.map((choice) =>
            multi ? (
              <Chip
                key={choice.value}
                multi
                selected={values.includes(choice.value)}
                onClick={() =>
                  onValuesChange(
                    values.includes(choice.value)
                      ? values.filter((v) => v !== choice.value)
                      : [...values, choice.value]
                  )
                }
              >
                {choice.label}
              </Chip>
            ) : (
              <Chip
                key={choice.value}
                selected={value === choice.value}
                onClick={() => onValueChange(value === choice.value ? "" : choice.value)}
              >
                {choice.label}
              </Chip>
            )
          )
        )}
      </div>
    </div>
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
  onSubmit,
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
  onSubmit: () => void;
}) {
  if (!config) return null;
  const inputClass =
    "w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm text-fg outline-none transition focus:border-slate focus:bg-surface focus:ring-2 focus:ring-slate-light";
  const isDateTime = config.type === "datetime";
  const DateField = isDateTime ? DateTimeInput : DateInput;
  const submitOnEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  if (operator === "between" && (config.type === "date" || isDateTime)) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <DateField value={from} onChange={onFromChange} ariaLabel="From" placeholder="From" popoverZIndex={110} />
        <DateField value={to} onChange={onToChange} ariaLabel="To" placeholder="To" popoverZIndex={110} />
      </div>
    );
  }

  if (operator === "in" || operator === "not_in") {
    if (config.choices) {
      return (
        <ChoicePicker
          multi
          choices={config.choices}
          value={value}
          values={values}
          onValueChange={onValueChange}
          onValuesChange={onValuesChange}
        />
      );
    }
    return (
      <input
        autoFocus
        value={values.join(", ")}
        onChange={(e) => onValuesChange(e.target.value.split(",").map((v) => v.trim()).filter(Boolean))}
        onKeyDown={submitOnEnter}
        placeholder="Comma-separated values"
        className={inputClass}
      />
    );
  }

  if (config.type === "boolean") {
    const current = value || "true";
    return (
      <div className="flex gap-1.5" role="radiogroup" aria-label="Filter value">
        <Chip selected={current === "true"} onClick={() => onValueChange("true")}>Yes</Chip>
        <Chip selected={current === "false"} onClick={() => onValueChange("false")}>No</Chip>
      </div>
    );
  }

  if ((config.type === "choice" || config.type === "uuid") && config.choices) {
    return (
      <ChoicePicker
        multi={false}
        choices={config.choices}
        value={value}
        values={values}
        onValueChange={onValueChange}
        onValuesChange={onValuesChange}
      />
    );
  }

  if (config.type === "number") {
    return (
      <input
        autoFocus
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={submitOnEnter}
        placeholder="Enter a number"
        className={inputClass}
      />
    );
  }

  if (config.type === "date" || config.type === "datetime") {
    return <DateField value={value} onChange={onValueChange} ariaLabel="Filter value" popoverZIndex={110} />;
  }

  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={submitOnEnter}
      placeholder={config.type === "uuid" ? "UUID" : "Value"}
      className={inputClass}
    />
  );
}
