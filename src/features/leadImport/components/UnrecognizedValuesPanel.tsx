"use client";

import { ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { useImportPicklists } from "@/features/leadImport/hooks/useImportPicklists";
import {
  BLANK_VALUE,
  type ImportFieldDef,
  type UnrecognizedValue,
} from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { card, linkButton, primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";
import { plural } from "@/features/leadImport/utils/reviewSummary";
import Select, { type SelectOption } from "@/shared/components/Select";

const VALUES_SHOWN = 8;

type ValueMapping = Record<string, Record<string, string>>;

interface UnrecognizedValuesPanelProps {
  unrecognized: Record<string, UnrecognizedValue[]>;
  fields: ImportFieldDef[];
  /** options.value_mapping as saved. */
  savedMapping: ValueMapping;
  /** Saves the new mapping and checks again. */
  onApply: (mapping: ValueMapping) => void;
  /** Sets options.unknown_values_as_blank and checks again. */
  onLeaveAllBlank: () => void;
}

/**
 * Dropdown values in the file that match none of the company's options. Each
 * one can be matched to an existing option or left blank. New options cannot
 * be created during an import.
 */
export default function UnrecognizedValuesPanel({
  unrecognized,
  fields,
  savedMapping,
  onApply,
  onLeaveAllBlank,
}: UnrecognizedValuesPanelProps) {
  const { lists, status, retry } = useImportPicklists(true);
  // Choices not saved yet: {field: {file value: option | "__blank__" | ""}}. "" clears a saved choice.
  const [edits, setEdits] = useState<ValueMapping>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fieldKeys = useMemo(
    () => Object.keys(unrecognized).filter((key) => (unrecognized[key] ?? []).length > 0),
    [unrecognized],
  );
  const totalValues = fieldKeys.reduce((sum, key) => sum + unrecognized[key].length, 0);
  const pending = Object.values(edits).some((forField) => Object.keys(forField).length > 0);

  function labelFor(key: string): string {
    return fields.find((field) => field.key === key)?.label ?? key;
  }

  function optionsFor(key: string): SelectOption[] {
    const names = (lists as unknown as Record<string, string[] | undefined> | null)?.[key] ?? [];
    return [
      { value: "", label: "Not chosen", muted: true },
      { value: BLANK_VALUE, label: "Leave blank" },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }

  function current(key: string, value: string): string {
    return edits[key]?.[value] ?? savedMapping[key]?.[value] ?? "";
  }

  function choose(key: string, value: string, choice: string) {
    setEdits((all) => ({ ...all, [key]: { ...(all[key] ?? {}), [value]: choice } }));
  }

  function apply() {
    const next: ValueMapping = {};
    for (const [key, forField] of Object.entries(savedMapping)) next[key] = { ...forField };
    for (const [key, forField] of Object.entries(edits)) {
      for (const [value, choice] of Object.entries(forField)) {
        if (choice) next[key] = { ...(next[key] ?? {}), [value]: choice };
        else if (next[key]) delete next[key][value];
      }
    }
    setEdits({});
    onApply(next);
  }

  return (
    <section aria-label="Dropdown values to match" className={`${card} p-3 sm:p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListChecks size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-fg">Dropdown values to match</h2>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {formatCount(totalValues)} {plural(totalValues, "value in your file does", "values in your file do")} not match
            an option in your dropdowns. Values can only be matched to options that already exist. To use a new value, add
            it to your dropdown settings first, then check again.
          </p>
        </div>
        <button
          type="button"
          className={secondaryButton}
          onClick={onLeaveAllBlank}
          title="Rows keep going; these cells are left empty."
        >
          Leave all unmatched blank
        </button>
      </div>

      {status === "error" && (
        <div role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          <p className="font-medium">We could not load your dropdown options.</p>
          <p className="mt-0.5">Check your connection, then try again. You can still leave values blank.</p>
          <button type="button" className={`${linkButton} mt-1 !text-danger`} onClick={retry}>
            Try again
          </button>
        </div>
      )}

      <div className="mt-3 space-y-4">
        {fieldKeys.map((key) => {
          const values = unrecognized[key];
          const all = expanded[key] === true;
          const visible = all ? values : values.slice(0, VALUES_SHOWN);
          const options = optionsFor(key);
          return (
            <div key={key}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{labelFor(key)}</h3>
              <ul className="mt-1.5 divide-y divide-line rounded-md border border-line">
                {visible.map((item) => {
                  const chosen = current(key, item.value);
                  return (
                    <li key={item.value} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="break-words text-sm font-medium text-fg">
                          {item.value.trim() === "" ? "(blank)" : item.value}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {formatCount(item.count)} {plural(item.count, "row", "rows")}
                        </p>
                        {item.suggestions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-ink-soft">Did you mean:</span>
                            {item.suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                aria-pressed={chosen === suggestion}
                                onClick={() => choose(key, item.value, suggestion)}
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
                                  chosen === suggestion
                                    ? "border-slate bg-slate-light text-slate"
                                    : "border-line bg-paper text-fg hover:bg-slate-light"
                                }`}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="w-full sm:w-52">
                        <Select
                          size="sm"
                          value={chosen}
                          options={options}
                          onChange={(next) => choose(key, item.value, next)}
                          disabled={status === "loading"}
                          ariaLabel={`Option for ${labelFor(key)} value ${item.value || "blank"}`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {values.length > VALUES_SHOWN && (
                <button
                  type="button"
                  className={`${linkButton} mt-1.5`}
                  onClick={() => setExpanded((state) => ({ ...state, [key]: !all }))}
                >
                  {all ? "Show fewer values" : `Show all ${values.length} values`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <button type="button" className={primaryButton} disabled={!pending} onClick={apply}>
          Apply and check again
        </button>
        {!pending && <span className="text-xs text-ink-soft">Choose an option for at least one value to enable this.</span>}
      </div>
    </section>
  );
}
