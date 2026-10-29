import type { PaginationMeta } from "@/shared/types/pagination";

/**
 * Types for the Lead Import feature. They mirror the backend JSON 1:1
 * (snake_case, no mapping layer). Endpoints live under /leads/import/.
 */

export type ImportFileFormat = "csv" | "xlsx";

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

export interface ImportLimits {
  max_bytes: number;
  max_rows: number;
  allowed_extensions: string[];
}

/** Used only until the first upload answers with the server's own limits. */
export const DEFAULT_IMPORT_LIMITS: ImportLimits = {
  max_bytes: 10 * 1024 * 1024,
  max_rows: 10_000,
  allowed_extensions: [".csv", ".xlsx"],
};

export type ImportFieldKind =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "int"
  | "picklist"
  | "owner"
  | "bool";

export interface ImportFieldDef {
  key: string;
  label: string;
  required: boolean;
  kind: ImportFieldKind;
}

export type MappingConfidence = "exact" | "alias" | "guess" | "none";

export interface SuggestedMapping {
  field: string | null;
  confidence: MappingConfidence;
}

/** {file header: field key | "__ignore__"} */
export type ImportMapping = Record<string, string>;

export const IGNORE_COLUMN = "__ignore__";

export interface ImportSampleRow {
  row_number: number;
  values: Record<string, string>;
}

export interface UploadResponse {
  job_id: string;
  file_name: string;
  total_rows: number;
  headers: string[];
  sheet_names: string[];
  header_row: number;
  sheet_name: string | null;
  warnings: string[];
  suggested_mapping: Record<string, SuggestedMapping>;
  sample_rows: ImportSampleRow[];
  fields: ImportFieldDef[];
  limits: ImportLimits;
}

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export type DuplicateAction = "skip" | "update" | "create_anyway";
export type OwnerMode = "me" | "from_file" | "selected";
export type OwnerUnmatchedAction = "use_fallback" | "error";
export type AccountContactMatch = "use_existing" | "create_new";

export interface OwnerChoice {
  kind: "single" | "round_robin";
  owner_id: string | null;
  owner_ids: string[];
}

export interface OwnerPlan {
  mode: OwnerMode;
  fallback: OwnerChoice;
  selected: OwnerChoice;
  on_unmatched: OwnerUnmatchedAction;
  /** {raw value from the file: user id} */
  owner_value_mapping: Record<string, string>;
  change_owner_on_update: boolean;
}

export type ExclusionOperator =
  | "is_blank"
  | "is_not_blank"
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains";

export interface ImportExclusionRule {
  column: string;
  operator: ExclusionOperator;
  value: string;
}

export interface ImportExclusions {
  row_numbers: number[];
  rules: ImportExclusionRule[];
  skip_rows_with_errors: boolean;
}

export interface ImportExtraColumn {
  column: string;
  label: string;
}

/** Marker used inside value_mapping when a raw value should become empty. */
export const BLANK_VALUE = "__blank__";

export interface ImportOptions {
  duplicate_action: DuplicateAction;
  owner_plan: OwnerPlan;
  split_multiple_phones: boolean;
  extra_columns: ImportExtraColumn[];
  use_company_as_name: boolean;
  /** {field key: {raw value: option name | "__blank__"}} */
  value_mapping: Record<string, Record<string, string>>;
  unknown_values_as_blank: boolean;
  exclusions: ImportExclusions;
  account_match: AccountContactMatch;
  contact_match: AccountContactMatch;
  allow_repeat: boolean;
}

function createDefaultOwnerChoice(): OwnerChoice {
  return { kind: "single", owner_id: null, owner_ids: [] };
}

/** A fresh defaults object every call, so nothing is ever shared by reference. */
export function createDefaultImportOptions(): ImportOptions {
  return {
    duplicate_action: "skip",
    owner_plan: {
      mode: "me",
      fallback: createDefaultOwnerChoice(),
      selected: createDefaultOwnerChoice(),
      on_unmatched: "use_fallback",
      owner_value_mapping: {},
      change_owner_on_update: false,
    },
    split_multiple_phones: true,
    extra_columns: [],
    use_company_as_name: false,
    value_mapping: {},
    unknown_values_as_blank: false,
    exclusions: { row_numbers: [], rules: [], skip_rows_with_errors: false },
    account_match: "use_existing",
    contact_match: "use_existing",
    allow_repeat: false,
  };
}

/* ------------------------------------------------------------------ */
/* Rows, preview and validation                                        */
/* ------------------------------------------------------------------ */

export type RowStatus =
  | "ready"
  | "duplicate_skip"
  | "duplicate_update"
  | "duplicate_create"
  | "excluded"
  | "error"
  | "convert";

export interface RowProblem {
  row_number: number;
  column: string;
  field: string;
  value: string;
  code: string;
  message: string;
  how_to_fix: string;
}

export interface RowWarning {
  code: string;
  message: string;
}

/**
 * What the backend reports about a duplicate. The contract does not spell
 * out every key, so unknown keys are allowed and read defensively.
 */
export interface DuplicateInfo {
  matched_on?: string | null;
  lead_id?: string | null;
  lead_name?: string | null;
  [key: string]: unknown;
}

export type OwnerSource = "me" | "file" | "mapped_value" | "fallback" | "selected";

export interface OwnerInfo {
  id: string | null;
  name: string;
  source: OwnerSource;
}

export type ImportCellValue = string | number | boolean | null;

export interface PreviewRow {
  row_number: number;
  status: RowStatus;
  is_converted: boolean;
  values_by_field: Record<string, ImportCellValue>;
  owner: OwnerInfo | null;
  duplicate: DuplicateInfo | null;
  reason: string | null;
  problems: RowProblem[];
  warnings: RowWarning[];
}

export interface MappingPreviewResponse {
  errors: string[];
  warnings: string[];
  rows: PreviewRow[];
}

export interface DuplicatesSkipped {
  existing: number;
  in_file: number;
  converted_locked: number;
}

export interface ErrorGroup {
  code: string;
  label: string;
  count: number;
}

export interface OwnerSourceCounts {
  [source: string]: number;
}

export interface PerOwnerCount {
  owner_id: string;
  name: string;
  email: string;
  total: number;
  by_source: OwnerSourceCounts;
}

export interface UnmatchedOwnerFallback {
  owner_id: string;
  name: string;
  count: number;
}

export interface UnmatchedOwnerValue {
  value: string;
  code: string;
  count: number;
  first_row: number;
  rejected: boolean;
  fell_back_to: UnmatchedOwnerFallback[];
}

export interface OwnerSummary {
  total: number;
  rejected: number;
  per_owner: PerOwnerCount[];
  unmatched_values: UnmatchedOwnerValue[];
}

export interface UnrecognizedValue {
  value: string;
  count: number;
  suggestions: string[];
}

/** Settings were invalid, so no check ran. */
export interface ValidateNotChecked {
  checked: false;
  can_import: false;
  errors: string[];
  warnings: string[];
}

export interface ValidateChecked {
  checked: true;
  checked_at: string;
  errors: string[];
  warnings: string[];
  total: number;
  counts: Partial<Record<RowStatus, number>>;
  converted: number;
  duplicates_skipped: DuplicatesSkipped;
  error_groups: ErrorGroup[];
  owners: OwnerSummary;
  unrecognized: Record<string, UnrecognizedValue[]>;
  /** First 20 problems only. */
  problems: RowProblem[];
  importable_rows: number;
  can_import: boolean;
}

export type ValidateResponse = ValidateNotChecked | ValidateChecked;

export type RowsStatusFilter =
  | "all"
  | "ready"
  | "duplicate"
  | "error"
  | "excluded"
  | "converted";

export interface ImportRowResult {
  row_number: number;
  status: RowStatus;
  is_converted: boolean;
  /** {file header: cell text} */
  values: Record<string, string>;
  values_by_field: Record<string, ImportCellValue>;
  owner: OwnerInfo | null;
  duplicate: DuplicateInfo | null;
  reason: string | null;
  problems: RowProblem[];
  warnings: RowWarning[];
}

export interface ImportRowsCounts {
  all: number;
  ready: number;
  duplicate: number;
  error: number;
  excluded: number;
  converted: number;
}

export interface ImportRowsResponse {
  results: ImportRowResult[];
  pagination: PaginationMeta;
  counts: ImportRowsCounts;
  checked_at: string | null;
}

export interface ExclusionsResponse {
  exclusions: ImportExclusions;
  excluded_by_number: number;
  excluded_by_rules: number;
  needs_validate: true;
  message: string;
}

export interface ExclusionsPatch {
  row_numbers_add?: number[];
  row_numbers_remove?: number[];
  rules?: ImportExclusionRule[];
  skip_rows_with_errors?: boolean;
}

/* ------------------------------------------------------------------ */
/* Running, report, history, undo                                      */
/* ------------------------------------------------------------------ */

export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "undone"
  | "partly_undone";

export type JobStage = "draft" | "running" | "cancelled" | null;

export type NextAction = "call_process_again" | "done" | "failed";

export interface ProgressResult {
  job_id: string;
  status: JobStatus;
  stage: JobStage;
  total_rows: number;
  processed_rows: number;
  percent: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  converted: number;
  started_at: string | null;
  last_activity_at: string | null;
  finished_at: string | null;
  message: string;
  next_action: NextAction;
}

export interface ReportJob {
  id: string;
  file_name: string;
  status: JobStatus;
  stage: JobStage;
  created_by_name: string;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
}

export interface ReportTotals {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  converted: number;
  excluded: number;
  not_processed: number;
}

export interface OutcomeGroup {
  code: string;
  title: string;
  count: number;
  how_to_fix: string;
  example_rows: number[];
}

export interface ReportDuplicates {
  action: DuplicateAction;
  matched_on_email: number;
  matched_on_phone: number;
  in_file: number;
}

export interface ReportOwner {
  name: string;
  count: number;
}

export interface ReportConverted {
  accounts_created: number;
  contacts_created: number;
  accounts_reused: number;
  contacts_reused: number;
}

export interface ReportWarning {
  code: string;
  message: string;
  count: number;
  example_rows: number[];
}

export interface ReportFiles {
  rejected_available: boolean;
  results_available: boolean;
  rows_purged: boolean;
  message?: string;
}

export interface ImportReport {
  job: ReportJob;
  message: string;
  totals: ReportTotals;
  outcome_groups: OutcomeGroup[];
  duplicates: ReportDuplicates;
  owners: ReportOwner[];
  converted: ReportConverted;
  warnings: ReportWarning[];
  mapped_values: unknown;
  files: ReportFiles;
  can_undo: boolean;
  can_reupload: boolean;
  undo_report?: UndoReport;
}

export interface UndoLeftAlone {
  kind: string;
  id_or_name: string;
  id: string | null;
  reason: string;
  code: string;
}

export interface UndoLeftAloneGroup {
  kind: string;
  code: string;
  reason: string;
  count: number;
}

export interface UndoPreview {
  job_id: string;
  file_name: string;
  status: JobStatus;
  is_retry: boolean;
  can_undo: boolean;
  reason_if_not: string | null;
  code: string | null;
  will_remove_leads: number;
  will_remove_accounts: number;
  will_remove_contacts: number;
  will_restore_updated_leads: number;
  will_leave_alone: UndoLeftAlone[];
  will_leave_alone_count: number;
  will_leave_alone_groups: UndoLeftAloneGroup[];
  already_deleted: number;
  reused_accounts_kept: number;
  reused_contacts_kept: number;
  restore_available: boolean;
  restore_note: string | null;
  message: string;
}

/** The backend does not fix the shape of the undo report, so it stays open. */
export type UndoReport = Record<string, unknown>;

export interface UndoResult {
  job_id: string;
  status: JobStatus;
  message: string;
  undo_report: UndoReport;
  can_undo: boolean;
}

export interface HistoryItem {
  job_id: string;
  file_name: string;
  status: JobStatus;
  stage: JobStage;
  created_by_name: string;
  created_at: string;
  finished_at: string | null;
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  converted: number;
  can_undo: boolean;
  undone_at: string | null;
  undone_by_name: string | null;
  files_available: boolean;
  rejected_file_available: boolean;
  results_file_available: boolean;
}

export interface ImportHistoryResponse {
  results: HistoryItem[];
  pagination: PaginationMeta;
}

/** Body of every 400 from the import endpoints. */
export interface ImportApiError {
  code: string;
  detail: string;
  how_to_fix: string;
}
