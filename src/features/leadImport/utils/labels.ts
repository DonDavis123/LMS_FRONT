import type {
  DuplicateAction,
  OwnerSource,
  RowStatus,
} from "@/features/leadImport/types/leadImport.types";

/** Plain-English labels for what will happen to each row. */
export const ROW_STATUS_LABELS: Record<RowStatus, string> = {
  ready: "Ready to add",
  duplicate_skip: "Duplicate, will be skipped",
  duplicate_update: "Duplicate, will be updated",
  duplicate_create: "Duplicate, will be added anyway",
  excluded: "Left out",
  error: "Has a problem",
  convert: "Will be added as converted",
};

export const OWNER_SOURCE_LABELS: Record<OwnerSource, string> = {
  me: "You",
  file: "From the file",
  mapped_value: "Matched from your choices",
  fallback: "Fallback owner",
  selected: "Chosen owner",
};

export const DUPLICATE_ACTION_LABELS: Record<DuplicateAction, string> = {
  skip: "Skip duplicates",
  update: "Update existing leads",
  create_anyway: "Add them anyway",
};

/** Names for the two virtual fields that are not plain lead columns. */
export const VIRTUAL_FIELD_LABELS = {
  owner: "Lead owner",
  converted: "Converted (Yes/No)",
} as const;

export function rowStatusLabel(status: string): string {
  return ROW_STATUS_LABELS[status as RowStatus] ?? status;
}

export function ownerSourceLabel(source: string): string {
  return OWNER_SOURCE_LABELS[source as OwnerSource] ?? source;
}

export function duplicateActionLabel(action: string): string {
  return DUPLICATE_ACTION_LABELS[action as DuplicateAction] ?? action;
}
