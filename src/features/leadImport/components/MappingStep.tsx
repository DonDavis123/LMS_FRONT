"use client";

import { useMemo, useState } from "react";
import type { LeadImportWizard } from "@/features/leadImport/hooks/useLeadImportWizard";
import { buildStartingMapping } from "@/features/leadImport/hooks/useLeadImportWizard";
import { useMappingPreview } from "@/features/leadImport/hooks/useMappingPreview";
import { useStepFooter } from "@/features/leadImport/hooks/useStepFooter";
import MappingPreviewTable, { type PreviewState } from "@/features/leadImport/components/MappingPreviewTable";
import MappingRow, { MAPPING_GRID } from "@/features/leadImport/components/MappingRow";
import { MappingErrors, MappingWarnings } from "@/features/leadImport/components/MappingMessages";
import MappingToolbar from "@/features/leadImport/components/MappingToolbar";
import NameHelperCard from "@/features/leadImport/components/NameHelperCard";
import {
  IGNORE_COLUMN,
  type ImportExtraColumn,
  type ImportFieldDef,
  type ImportMapping,
} from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import {
  COMPANY_FIELD,
  DESCRIPTION_FIELD,
  NAME_FIELD,
  clientMappingBlock,
  columnLabel,
  fieldUsage,
  hasAnyMapped,
  isExtraColumn,
  isFieldMapped,
  mappingEqualsStart,
  matchKindFor,
  nameStatus,
  requiredFieldStatuses,
  summarizeMapping,
  unmatchedColumns,
} from "@/features/leadImport/utils/mappingRules";
import type { StepFooter } from "@/features/leadImport/utils/stepFooter";

const NO_HEADERS: string[] = [];
const NO_FIELDS: ImportFieldDef[] = [];

interface MappingStepProps {
  wizard: LeadImportWizard;
  onFooterChange: (footer: StepFooter | null) => void;
}

/** Step 2: say what each column of the file should become, with a live preview. */
export default function MappingStep({ wizard, onFooterChange }: MappingStepProps) {
  const { state } = wizard;
  const { upload, mapping, options, preview, previewKey } = state;
  const [query, setQuery] = useState("");

  const headers = upload?.headers ?? NO_HEADERS;
  const fields = upload?.fields ?? NO_FIELDS;
  const extras = options.extra_columns;
  const useCompany = options.use_company_as_name;

  const start = useMemo(() => (upload ? buildStartingMapping(upload) : {}), [upload]);
  const usage = useMemo(() => fieldUsage(mapping), [mapping]);
  const anyMapped = hasAnyMapped(mapping);
  const name = nameStatus(mapping, useCompany);
  const summary = summarizeMapping(headers, mapping, extras);
  const unmatched = useMemo(
    () => (upload ? unmatchedColumns(headers, mapping, start, upload.suggested_mapping) : []),
    [upload, headers, mapping, start],
  );

  /* ---------------- live preview ---------------- */

  const signature = useMemo(() => JSON.stringify({ mapping, options }), [mapping, options]);
  const { pending, loading, error: previewError, retry } = useMappingPreview({
    jobId: upload?.job_id ?? "",
    signature,
    enabled: upload !== null && anyMapped,
    previewKey,
    onResult: (result, key) => {
      wizard.setPreview(result, key);
      wizard.markStale();
    },
  });

  /* ---------------- changes ---------------- */

  /** Applies a new mapping plus the option changes that must go with it, in one update. */
  function applyMapping(next: ImportMapping, extraColumns: ImportExtraColumn[] = extras) {
    wizard.setMapping(next);
    const patch: { extra_columns?: ImportExtraColumn[]; use_company_as_name?: boolean } = {};
    if (extraColumns !== extras) patch.extra_columns = extraColumns;
    // Company-as-name only makes sense while a column feeds Company name.
    if (useCompany && !isFieldMapped(next, COMPANY_FIELD)) patch.use_company_as_name = false;
    if (Object.keys(patch).length > 0) wizard.patchOptions(patch);
  }

  function handleChangeField(header: string, field: string) {
    const next = { ...mapping, [header]: field };
    // A column is either mapped or kept as extra, never both.
    const extraColumns =
      field !== IGNORE_COLUMN && isExtraColumn(extras, header) ? extras.filter((extra) => extra.column !== header) : extras;
    applyMapping(next, extraColumns);
  }

  function handleToggleKeep(header: string) {
    const next = isExtraColumn(extras, header)
      ? extras.filter((extra) => extra.column !== header)
      : [...extras, { column: header, label: header }];
    wizard.patchOptions({ extra_columns: next });
  }

  function handleReset() {
    wizard.setMapping({ ...start });
    wizard.patchOptions({ extra_columns: [], use_company_as_name: false });
  }

  function handleIgnoreUnmatched() {
    const next = { ...mapping };
    for (const header of unmatched) next[header] = IGNORE_COLUMN;
    applyMapping(next);
  }

  function handleCompanyToggle(next: boolean) {
    wizard.patchOptions({ use_company_as_name: next });
  }

  /* ---------------- what the screen shows ---------------- */

  // Nothing mapped means no request was made, so any stored preview is out of date.
  // After a failed request the old answer is not trusted either.
  const shownPreview = anyMapped && !previewError ? preview : null;
  const serverErrors = shownPreview?.errors ?? [];
  const serverWarnings = shownPreview?.warnings ?? [];
  const clientBlock = clientMappingBlock(mapping, useCompany);

  const previewColumns = useMemo(
    () =>
      fields.filter(
        (field) =>
          isFieldMapped(mapping, field.key) || (field.key === DESCRIPTION_FIELD && extras.length > 0),
      ),
    [fields, mapping, extras.length],
  );

  let previewState: PreviewState;
  if (!anyMapped) previewState = "empty";
  else if (previewError) previewState = "failed";
  else if (!shownPreview || (pending && loading)) previewState = "loading";
  else if (serverErrors.length > 0) previewState = "blocked";
  else previewState = "ready";

  const normalizedQuery = query.trim().toLowerCase();
  const visibleHeaders = normalizedQuery
    ? headers.filter((header) => columnLabel(header).toLowerCase().includes(normalizedQuery))
    : headers;

  const requiredStatuses = requiredFieldStatuses(fields, mapping, useCompany);
  const missingRequired = requiredStatuses.filter((item) => !item.mapped);

  /* ---------------- footer ---------------- */

  let footer: StepFooter;
  if (clientBlock) {
    footer = { step: "mapping", canContinue: false, reason: clientBlock, status: clientBlock, tone: "warning" };
  } else if (pending) {
    const reason = "Checking your mapping. Continue is available in a moment.";
    footer = { step: "mapping", canContinue: false, reason, status: "Checking your mapping...", tone: "neutral" };
  } else if (serverErrors.length > 0) {
    const reason = "Fix the problems shown above first.";
    footer = {
      step: "mapping",
      canContinue: false,
      reason,
      status: `${serverErrors.length} ${serverErrors.length === 1 ? "problem" : "problems"} to fix`,
      tone: "warning",
    };
  } else if (previewError) {
    footer = {
      step: "mapping",
      canContinue: true,
      reason: null,
      status: "Preview unavailable. You can still continue.",
      tone: "warning",
    };
  } else if (serverWarnings.length > 0) {
    footer = {
      step: "mapping",
      canContinue: true,
      reason: null,
      status: `${serverWarnings.length} ${serverWarnings.length === 1 ? "warning" : "warnings"}`,
      tone: "warning",
    };
  } else {
    footer = { step: "mapping", canContinue: true, reason: null, status: "Ready to continue", tone: "success" };
  }
  useStepFooter(footer, onFooterChange);

  if (!upload) return null;

  const hasNameField = fields.some((field) => field.key === NAME_FIELD);
  const nameMissing = hasNameField && !name.satisfied;
  const showNameHelper = hasNameField && (!name.nameMapped || useCompany);

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">Match your columns</h2>
        <p className="text-xs text-ink-soft">
          Choose what each column in your file should become. The preview below updates as you go.
        </p>
      </div>

      <MappingToolbar
        summary={summary}
        required={requiredStatuses}
        query={query}
        onQueryChange={setQuery}
        canReset={
          !mappingEqualsStart(headers, mapping, start) || extras.length > 0 || useCompany
        }
        onReset={handleReset}
        unmatchedCount={unmatched.length}
        onIgnoreUnmatched={handleIgnoreUnmatched}
      />

      {missingRequired.length > 0 && (
        <div role="status" className="rounded-lg border border-amber/40 bg-amber/10 p-3 text-sm text-fg sm:p-4">
          <span className="font-semibold">Still to map: </span>
          {missingRequired.map((item) => item.field.label).join(", ")}.{" "}
          {nameMissing ? "A name is needed for every lead." : "These fields are marked Required."}
        </div>
      )}

      {showNameHelper && (
        <NameHelperCard checked={useCompany} companyMapped={name.companyMapped} onChange={handleCompanyToggle} />
      )}

      <MappingErrors errors={serverErrors} />
      <MappingWarnings warnings={serverWarnings} />

      <section className="rounded-lg border border-line bg-surface" aria-labelledby="import-mapping-title">
        <h3 id="import-mapping-title" className="sr-only">
          Columns in your file
        </h3>
        <div
          className={`hidden border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-soft ${MAPPING_GRID}`}
          aria-hidden="true"
        >
          <span>Column in your file</span>
          <span />
          <span>Maps to</span>
          <span>Match</span>
        </div>

        {visibleHeaders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-ink-soft">
              {headers.length === 0 ? "Your file has no columns." : `No column matches “${query.trim()}”.`}
            </p>
            {headers.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-2 rounded text-sm font-semibold text-slate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                Show all {formatCount(headers.length)} columns
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visibleHeaders.map((header) => (
              <MappingRow
                key={header}
                header={header}
                value={mapping[header] ?? IGNORE_COLUMN}
                fields={fields}
                usage={usage}
                sampleRows={upload.sample_rows}
                matchKind={matchKindFor(header, mapping, start, upload.suggested_mapping)}
                keptInDescription={isExtraColumn(extras, header)}
                onChange={handleChangeField}
                onToggleKeep={handleToggleKeep}
              />
            ))}
          </ul>
        )}
      </section>

      <MappingPreviewTable
        state={previewState}
        columns={previewColumns}
        rows={shownPreview?.rows ?? []}
        dimmed={pending && previewState === "ready"}
        error={previewError}
        onRetry={retry}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {pending ? "Checking your mapping" : serverErrors.length > 0 ? `${serverErrors.length} problems found` : "Preview is up to date"}
      </p>
    </div>
  );
}
