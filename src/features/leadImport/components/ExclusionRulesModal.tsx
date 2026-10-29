"use client";

import { Plus, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type {
  ExclusionOperator,
  ExclusionsResponse,
  ImportExclusionRule,
  ImportMapping,
} from "@/features/leadImport/types/leadImport.types";
import type { ExclusionOutcome } from "@/features/leadImport/hooks/useRowExclusions";
import { formatCount } from "@/features/leadImport/utils/format";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import {
  MAX_EXCLUSION_RULES,
  OPERATOR_OPTIONS,
  buildPresets,
  isRuleComplete,
  normalizeRules,
  operatorNeedsValue,
  rulesEqual,
  sameRule,
} from "@/features/leadImport/utils/exclusionRules";
import { columnLabel } from "@/features/leadImport/utils/mappingRules";
import { primaryButton, secondaryButton, smallButton } from "@/features/leadImport/utils/reviewStyles";
import { plural } from "@/features/leadImport/utils/reviewSummary";
import Modal from "@/shared/components/Modal";
import Select, { type SelectOption } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch";

interface ExclusionRulesModalProps {
  headers: string[];
  mapping: ImportMapping;
  /** The rules and the errors switch as last saved. */
  savedRules: ImportExclusionRule[];
  savedSkipErrors: boolean;
  /** The numbers from the last save, shown as the live line. */
  lastResult: Pick<ExclusionsResponse, "excluded_by_number" | "excluded_by_rules"> | null;
  saving: boolean;
  onSave: (rules: ImportExclusionRule[], skipRowsWithErrors: boolean) => Promise<ExclusionOutcome>;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none transition placeholder:text-ink-soft focus:border-slate focus:ring-2 focus:ring-slate-light";

/** "Leave out rows by rule". Mounted only while open, so it always starts from the saved rules. */
export default function ExclusionRulesModal({
  headers,
  mapping,
  savedRules,
  savedSkipErrors,
  lastResult,
  saving,
  onSave,
  onClose,
}: ExclusionRulesModalProps) {
  const titleId = useId();
  const [rules, setRules] = useState<ImportExclusionRule[]>(() => savedRules.map((rule) => ({ ...rule })));
  const [skipErrors, setSkipErrors] = useState(savedSkipErrors);
  const [error, setError] = useState<ImportErrorInfo | null>(null);
  const [result, setResult] = useState(lastResult);

  const columnOptions = useMemo<SelectOption[]>(
    () => headers.filter((header) => header !== "").map((header) => ({ value: header, label: columnLabel(header) })),
    [headers],
  );
  const presets = useMemo(() => buildPresets(mapping), [mapping]);

  const atLimit = rules.length >= MAX_EXCLUSION_RULES;
  const incomplete = rules.some((rule) => !isRuleComplete(rule));
  const dirty = !rulesEqual(normalizeRules(rules), normalizeRules(savedRules)) || skipErrors !== savedSkipErrors;

  function updateRule(index: number, change: Partial<ImportExclusionRule>) {
    setRules((current) => current.map((rule, i) => (i === index ? { ...rule, ...change } : rule)));
  }

  function addRule(rule?: ImportExclusionRule) {
    if (atLimit) return;
    setRules((current) => [...current, rule ?? { column: "", operator: "is_blank", value: "" }]);
  }

  async function save() {
    setError(null);
    const outcome = await onSave(normalizeRules(rules), skipErrors);
    if (outcome.error) {
      setError(outcome.error);
      return;
    }
    if (outcome.response) {
      setResult({
        excluded_by_number: outcome.response.excluded_by_number,
        excluded_by_rules: outcome.response.excluded_by_rules,
      });
    }
  }

  return (
    <Modal isOpen onClose={onClose} ariaLabelledBy={titleId} maxWidthClass="max-w-2xl">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-4 sm:px-5">
        <h2 id={titleId} className="pr-8 font-serif text-lg text-fg">
          Leave out rows by rule
        </h2>
        <p className="mt-0.5 text-xs text-ink-soft">
          A row is left out when any of the rules below matches it. Matching ignores upper and lower case.
        </p>

        {presets.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Quick rules</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {presets.map((preset) => {
                const exists = rules.some((rule) => sameRule(rule, preset.rule));
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={smallButton}
                    disabled={exists || atLimit}
                    onClick={() => addRule({ ...preset.rule })}
                  >
                    <Plus size={12} aria-hidden="true" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {rules.length === 0 && (
            <p className="rounded-md border border-dashed border-line bg-paper px-3 py-4 text-center text-sm text-ink-soft">
              No rules yet. Add one, or use a quick rule above.
            </p>
          )}
          {rules.map((rule, index) => {
            const needsValue = operatorNeedsValue(rule.operator);
            return (
              <div
                key={index}
                role="group"
                aria-label={`Rule ${index + 1}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md border border-line bg-paper p-2 sm:grid-cols-[minmax(0,1fr)_9.5rem_minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <Select
                    size="sm"
                    value={rule.column}
                    options={columnOptions}
                    onChange={(next) => updateRule(index, { column: next })}
                    placeholder="Choose a column"
                    ariaLabel={`Column for rule ${index + 1}`}
                    ariaInvalid={!rule.column}
                  />
                </div>
                <div className="order-3 min-w-0 sm:order-none">
                  <Select
                    size="sm"
                    value={rule.operator}
                    options={OPERATOR_OPTIONS}
                    onChange={(next) => updateRule(index, { operator: next as ExclusionOperator })}
                    ariaLabel={`Condition for rule ${index + 1}`}
                  />
                </div>
                <div className="order-4 col-span-2 min-w-0 sm:order-none sm:col-span-1">
                  {needsValue ? (
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(event) => updateRule(index, { value: event.target.value })}
                      placeholder="Value"
                      aria-label={`Value for rule ${index + 1}`}
                      aria-invalid={rule.value.trim() === ""}
                      className={inputClass}
                    />
                  ) : (
                    <span className="block py-1.5 text-xs text-ink-soft">No value needed</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRules((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Remove rule ${index + 1}`}
                  className="rounded-md p-1.5 text-ink-soft transition hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-ink-soft">
          To match several values, separate them with | (for example: gmail.com|yahoo.com). This works with equals and
          contains.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" className={secondaryButton} onClick={() => addRule()} disabled={atLimit}>
            <Plus size={14} aria-hidden="true" />
            Add rule
          </button>
          <span className="text-xs text-ink-soft">
            {atLimit ? `You can add up to ${MAX_EXCLUSION_RULES} rules.` : `${rules.length} of ${MAX_EXCLUSION_RULES} rules`}
          </span>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2">
          <div className="min-w-0">
            <p id={`${titleId}-skip`} className="text-sm font-medium text-fg">
              Also leave out rows that have errors
            </p>
            <p className="text-xs text-ink-soft">Rows with a problem are skipped instead of listed as needing attention.</p>
          </div>
          <Switch checked={skipErrors} onChange={setSkipErrors} ariaLabel="Also leave out rows that have errors" showState />
        </div>

        <div className="mt-3 min-h-[1.25rem]" aria-live="polite">
          {error && (
            <div role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              <p className="font-medium">{error.message}</p>
              {error.howToFix && <p className="mt-0.5">{error.howToFix}</p>}
            </div>
          )}
          {!error && result && (
            <p className="text-sm text-fg">
              <span className="font-medium">
                Matches {formatCount(result.excluded_by_rules)} {plural(result.excluded_by_rules, "row", "rows")}
              </span>
              <span className="text-ink-soft">
                {" "}
                by rule, and {formatCount(result.excluded_by_number)} {plural(result.excluded_by_number, "row", "rows")} left
                out by hand. The counts update in a moment.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 sm:px-5">
        {incomplete && <p className="mr-auto text-xs text-ink-soft">Finish or remove the rules that are not complete.</p>}
        <button type="button" className={secondaryButton} onClick={onClose}>
          Close
        </button>
        <button type="button" className={primaryButton} disabled={!dirty || incomplete || saving} onClick={() => void save()}>
          {saving ? "Saving..." : "Save rules"}
        </button>
      </div>
    </Modal>
  );
}
