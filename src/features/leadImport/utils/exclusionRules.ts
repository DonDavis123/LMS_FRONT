import type { SelectOption } from "@/shared/components/Select";
import type {
  ExclusionOperator,
  ImportExclusionRule,
  ImportMapping,
} from "@/features/leadImport/types/leadImport.types";
import { isIgnored } from "@/features/leadImport/utils/mappingRules";

/** The most rules the backend accepts. */
export const MAX_EXCLUSION_RULES = 20;

export const OPERATOR_LABELS: Record<ExclusionOperator, string> = {
  is_blank: "is blank",
  is_not_blank: "is not blank",
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
};

export const OPERATOR_OPTIONS: SelectOption[] = (Object.keys(OPERATOR_LABELS) as ExclusionOperator[]).map((value) => ({
  value,
  label: OPERATOR_LABELS[value],
}));

export function operatorNeedsValue(operator: ExclusionOperator): boolean {
  return operator !== "is_blank" && operator !== "is_not_blank";
}

export function isRuleComplete(rule: ImportExclusionRule): boolean {
  if (!rule.column) return false;
  return operatorNeedsValue(rule.operator) ? rule.value.trim() !== "" : true;
}

export function sameRule(a: ImportExclusionRule, b: ImportExclusionRule): boolean {
  const aValue = operatorNeedsValue(a.operator) ? a.value : "";
  const bValue = operatorNeedsValue(b.operator) ? b.value : "";
  return a.column === b.column && a.operator === b.operator && aValue === bValue;
}

/** Rules as they are saved: the value is dropped when the operator does not use one. */
export function normalizeRules(rules: ImportExclusionRule[]): ImportExclusionRule[] {
  return rules.map((rule) => ({
    column: rule.column,
    operator: rule.operator,
    value: operatorNeedsValue(rule.operator) ? rule.value : "",
  }));
}

export function rulesEqual(a: ImportExclusionRule[], b: ImportExclusionRule[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((rule, index) => sameRule(rule, b[index]));
}

export interface RulePreset {
  id: string;
  label: string;
  rule: ImportExclusionRule;
}

/**
 * Quick starting points built from the columns the user mapped.
 *
 * A row is left out when ANY rule matches, so "no email AND no phone" cannot
 * be written as two rules. The presets are therefore single, honest rules.
 */
export function buildPresets(mapping: ImportMapping): RulePreset[] {
  const headerFor = (fieldKey: string): string | null =>
    Object.keys(mapping).find((header) => !isIgnored(mapping[header]) && mapping[header] === fieldKey && header !== "") ??
    null;

  const presets: RulePreset[] = [];
  const email = headerFor("email");
  const phone = headerFor("phone") ?? headerFor("mobile");
  const name = headerFor("name");
  if (email) presets.push({ id: "no-email", label: "Rows with no email", rule: { column: email, operator: "is_blank", value: "" } });
  if (phone) presets.push({ id: "no-phone", label: "Rows with no phone", rule: { column: phone, operator: "is_blank", value: "" } });
  if (name) presets.push({ id: "no-name", label: "Rows with a blank name", rule: { column: name, operator: "is_blank", value: "" } });
  return presets;
}
