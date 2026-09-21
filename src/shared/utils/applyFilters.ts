import type { FilterCondition } from "@/shared/components/FilterBar";

/**
 * Applies FilterBar conditions to an in-memory array. The app fetches up
 * to 50 records per list (the backend's page_size cap) and filters that
 * page client-side — `getValue` maps a condition's `field` name to the
 * actual value on the item (letting each list handle its own nested/typed
 * shape, e.g. a Lead's `owner` field living at `lead.owner?.id`).
 */
export function applyFilters<T>(
  items: T[],
  filters: FilterCondition[],
  getValue: (item: T, field: string) => unknown
): T[] {
  if (filters.length === 0) return items;
  return items.filter((item) => filters.every((condition) => matches(getValue(item, condition.field), condition)));
}

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

function toComparable(value: unknown): number | string {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const asDate = Date.parse(value);
    return Number.isNaN(asDate) ? value.toLowerCase() : asDate;
  }
  return "";
}

function compare(a: unknown, b: unknown): number {
  const left = toComparable(a);
  const right = toComparable(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function matches(raw: unknown, condition: FilterCondition): boolean {
  switch (condition.operator) {
    case "contains":
      return normalize(raw).includes(normalize(condition.value));
    case "not_contains":
      return !normalize(raw).includes(normalize(condition.value));
    case "starts_with":
      return normalize(raw).startsWith(normalize(condition.value));
    case "ends_with":
      return normalize(raw).endsWith(normalize(condition.value));
    case "equals":
      return normalize(raw) === normalize(condition.value);
    case "not_equals":
      return normalize(raw) !== normalize(condition.value);
    case "in":
      return Array.isArray(condition.value) && condition.value.some((v) => normalize(v) === normalize(raw));
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.some((v) => normalize(v) === normalize(raw));
    case "before":
      return raw != null && raw !== "" && compare(raw, condition.value) <= 0;
    case "after":
      return raw != null && raw !== "" && compare(raw, condition.value) >= 0;
    case "between": {
      if (raw == null || raw === "") return false;
      const { from, to } = (condition.value ?? {}) as { from?: unknown; to?: unknown };
      return compare(raw, from) >= 0 && compare(raw, to) <= 0;
    }
    default:
      return true;
  }
}
