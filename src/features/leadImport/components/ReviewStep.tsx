"use client";

import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import DuplicatesCard from "@/features/leadImport/components/DuplicatesCard";
import ExclusionRulesModal from "@/features/leadImport/components/ExclusionRulesModal";
import ImportToast, { useImportToast } from "@/features/leadImport/components/ImportToast";
import IssuesPanel from "@/features/leadImport/components/IssuesPanel";
import OwnerMatchPanel from "@/features/leadImport/components/OwnerMatchPanel";
import { CheckFailedBanner, SettingsProblemBanner, StaleBanner } from "@/features/leadImport/components/ReviewBanners";
import ReviewRowsTable, { type RowOverride } from "@/features/leadImport/components/ReviewRowsTable";
import { RowsEmptyState, RowsErrorState, RowsSkeleton } from "@/features/leadImport/components/ReviewRowsStates";
import { ReviewBulkBar, ReviewFilterTabs } from "@/features/leadImport/components/ReviewRowsToolbar";
import ReviewSkeleton from "@/features/leadImport/components/ReviewSkeleton";
import ReviewSummary from "@/features/leadImport/components/ReviewSummary";
import UnrecognizedValuesPanel from "@/features/leadImport/components/UnrecognizedValuesPanel";
import { useImportCheck } from "@/features/leadImport/hooks/useImportCheck";
import type { LeadImportWizard } from "@/features/leadImport/hooks/useLeadImportWizard";
import { useLeadOwners } from "@/features/leadImport/hooks/useLeadOwners";
import { useReviewRows } from "@/features/leadImport/hooks/useReviewRows";
import { useRowExclusions, type ExclusionOutcome } from "@/features/leadImport/hooks/useRowExclusions";
import { useRowSelection } from "@/features/leadImport/hooks/useRowSelection";
import { useStepFooter } from "@/features/leadImport/hooks/useStepFooter";
import type {
  ExclusionsResponse,
  ImportExclusionRule,
  ImportRowsCounts,
  RowsStatusFilter,
  UploadResponse,
  ValidateChecked,
} from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { card, secondaryButton } from "@/features/leadImport/utils/reviewStyles";
import { getReviewNumbers, summarySentence } from "@/features/leadImport/utils/reviewSummary";
import { buildKeyColumns } from "@/features/leadImport/utils/rowDisplay";
import type { StepFooter } from "@/features/leadImport/utils/stepFooter";
import SearchBox from "@/shared/components/SearchBox";
import ServerPagination from "@/shared/components/ServerPagination";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";

const ROWS_ID = "review-rows";
const DEFAULT_PAGE_SIZE = 20;

interface ReviewStepProps {
  wizard: LeadImportWizard;
  onFooterChange: (footer: StepFooter | null) => void;
}

/** Step 4: check the file against the settings, fix what needs fixing, and decide which rows to leave out. */
export default function ReviewStep({ wizard, onFooterChange }: ReviewStepProps) {
  const upload = wizard.state.upload;
  if (!upload) return null;
  return <ReviewStepBody wizard={wizard} upload={upload} onFooterChange={onFooterChange} />;
}

function errorText(error: ImportErrorInfo): string {
  return error.howToFix ? `${error.message} ${error.howToFix}` : error.message;
}

function formatCheckedAt(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ReviewStepBody({
  wizard,
  upload,
  onFooterChange,
}: ReviewStepProps & { upload: UploadResponse }) {
  const { state } = wizard;
  const { mapping, options, check, checkIsStale } = state;
  const jobId = upload.job_id;

  const { toast, showToast } = useImportToast();
  const { phase, error: checkError, run, notifyChanged } = useImportCheck({
    jobId,
    mapping,
    options,
    check,
    checkIsStale,
    setCheck: wizard.setCheck,
    markStale: wizard.markStale,
  });
  const { owners, status: ownersStatus, error: ownersError, retry: retryOwners } = useLeadOwners(
    state.owners,
    wizard.setOwners,
  );

  /* ---------------- what the check says right now ---------------- */

  const checked: ValidateChecked | null = check && check.checked ? check : null;
  const settingsProblem = check && !check.checked ? check : null;
  const checking = phase === "checking";
  const failed = phase === "failed";
  const outOfDate = checkIsStale || checking;
  const numbers = useMemo(() => (checked ? getReviewNumbers(checked) : null), [checked]);

  /* ---------------- rows table state ---------------- */

  const [filter, setFilter] = useState<RowsStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  // The search box keeps its own typed text; a new key empties it.
  const [searchBoxKey, setSearchBoxKey] = useState(0);
  const selection = useRowSelection();
  const { clear: clearSelection } = selection;
  const [overrides, setOverrides] = useState<{ base: string | null; rows: ReadonlyMap<number, RowOverride> }>({
    base: null,
    rows: new Map(),
  });

  const handleOutdated = useCallback(() => notifyChanged(0), [notifyChanged]);
  const rows = useReviewRows({
    jobId,
    status: filter,
    page,
    pageSize,
    q: search,
    enabled: checked !== null && !checkIsStale && !checking,
    refreshKey: checked?.checked_at ?? null,
    onCheckOutdated: handleOutdated,
  });

  // A page that no longer exists (the last rows were left out) falls back to the last page.
  const totalPages = rows.data?.pagination.total_pages ?? 0;
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      clearSelection();
    },
    [clearSelection],
  );

  function showFilter(next: RowsStatusFilter, scroll = false) {
    setFilter(next);
    setPage(1);
    clearSelection();
    if (!scroll) return;
    const element = document.getElementById(ROWS_ID);
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    element.focus({ preventScroll: true });
  }

  /* ---------------- leaving rows out ---------------- */

  const [rulesOpen, setRulesOpen] = useState(false);
  const [ruleResult, setRuleResult] = useState<Pick<ExclusionsResponse, "excluded_by_number" | "excluded_by_rules"> | null>(null);
  const exclusions = useRowExclusions({ jobId, patchOptions: wizard.patchOptions, onSaved: notifyChanged });
  const leftOutRows = useMemo(() => new Set(options.exclusions.row_numbers), [options.exclusions.row_numbers]);

  async function leaveOut(rowNumbers: number[]) {
    if (rowNumbers.length === 0) return;
    const base = rows.data?.checked_at ?? null;
    const outcome = await exclusions.leaveOut(rowNumbers);
    if (outcome.error) {
      showToast(errorText(outcome.error), "error");
      return;
    }
    setOverrides((current) => {
      const keep = current.base === base ? current.rows : new Map<number, RowOverride>();
      const next = new Map(keep);
      for (const row of rowNumbers) next.set(row, "excluded");
      return { base, rows: next };
    });
    clearSelection();
    showToast(rowNumbers.length === 1 ? "Row left out. Updating the counts..." : `${formatCount(rowNumbers.length)} rows left out. Updating the counts...`);
  }

  async function includeAgain(rowNumbers: number[]) {
    if (rowNumbers.length === 0) return;
    const outcome = await exclusions.includeAgain(rowNumbers);
    if (outcome.error) {
      showToast(errorText(outcome.error), "error");
      return;
    }
    clearSelection();
    showToast("Saved. Rows left out by a rule stay out until you change the rule.");
  }

  const selectedRows = Array.from(selection.selected);
  const bulkMode = filter === "excluded" ? "include" : "leave";
  function runBulk() {
    if (bulkMode === "include") void includeAgain(selectedRows);
    else void leaveOut(selectedRows);
  }
  // Delete leaves the ticked rows out (it can always be undone), like Delete in the Leads list.
  useSelectionKeyboard(bulkMode === "leave" && !exclusions.saving && !rulesOpen, selection.selected.size, runBulk);

  /* ---------------- rules modal ---------------- */


  async function saveRules(rules: ImportExclusionRule[], skipRowsWithErrors: boolean): Promise<ExclusionOutcome> {
    const outcome = await exclusions.apply({ rules, skip_rows_with_errors: skipRowsWithErrors });
    if (outcome.response) {
      setRuleResult({
        excluded_by_number: outcome.response.excluded_by_number,
        excluded_by_rules: outcome.response.excluded_by_rules,
      });
    }
    return outcome;
  }

  /* ---------------- owner and value choices: save, then check again at once ---------------- */

  function applyOwnerMapping(ownerValueMapping: Record<string, string>) {
    const ownerPlan = { ...options.owner_plan, owner_value_mapping: ownerValueMapping };
    wizard.patchOptions({ owner_plan: ownerPlan });
    void run({ options: { ...options, owner_plan: ownerPlan } });
  }

  function applyValueMapping(valueMapping: Record<string, Record<string, string>>) {
    wizard.patchOptions({ value_mapping: valueMapping });
    void run({ options: { ...options, value_mapping: valueMapping } });
  }

  function leaveAllBlank() {
    wizard.patchOptions({ unknown_values_as_blank: true });
    void run({ options: { ...options, unknown_values_as_blank: true } });
    showToast("Unmatched dropdown values will be left blank. You can change this in the options.");
  }

  /* ---------------- footer ---------------- */

  let reason: string | null = null;
  if (checking) reason = "Checking your file...";
  else if (exclusions.saving) reason = "Saving your changes...";
  else if (failed) reason = "The check did not finish. Try again to continue.";
  else if (!check) reason = "Your file has not been checked yet.";
  else if (checkIsStale) reason = "Your changes are saved. Update the counts to continue.";
  else if (!check.checked) reason = check.errors[0] ?? "Your settings need a change. Go back to fix them.";
  else if (!check.can_import) reason = "Nothing in this file can be imported yet.";

  const busyReason = checking || exclusions.saving;
  useStepFooter(
    {
      step: "review",
      canContinue: reason === null,
      reason,
      status: reason ?? (numbers ? summarySentence(numbers) : ""),
      tone: reason === null ? (numbers && numbers.errors > 0 ? "neutral" : "success") : busyReason ? "neutral" : "warning",
      continueLabel: "Continue to import",
    },
    onFooterChange,
  );

  /* ---------------- render ---------------- */

  const counts: ImportRowsCounts =
    rows.data?.counts ??
    (numbers
      ? {
          all: numbers.total,
          ready: numbers.ready,
          duplicate: numbers.duplicates,
          error: numbers.errors,
          excluded: numbers.leftOut,
          converted: numbers.converted,
        }
      : { all: 0, ready: 0, duplicate: 0, error: 0, excluded: 0, converted: 0 });

  const rowsCheckedAt = rows.data?.checked_at ?? null;
  const activeOverrides = useMemo<ReadonlyMap<number, RowOverride>>(
    () => (overrides.base === rowsCheckedAt ? overrides.rows : new Map<number, RowOverride>()),
    [overrides, rowsCheckedAt],
  );

  const keyColumns = useMemo(() => buildKeyColumns(upload.fields, mapping, options), [upload.fields, mapping, options]);
  const checkedTime = checked ? formatCheckedAt(checked.checked_at) : null;
  const justUpdated = phase === "done" && checked !== null && !checkIsStale;
  const pageRows = rows.data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">Review before you import</h2>
          <p className="text-xs text-ink-soft">
            Check the numbers, fix any problems, then continue. Nothing is added to your leads until the next step.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {checkedTime && !outOfDate && <span className="text-xs text-ink-soft">Checked at {checkedTime}</span>}
          <button type="button" className={secondaryButton} onClick={() => void run()} disabled={checking}>
            <RefreshCw size={14} aria-hidden="true" className={checking ? "animate-spin motion-reduce:animate-none" : undefined} />
            Check again
          </button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {justUpdated && numbers ? `Counts updated. ${summarySentence(numbers)}` : ""}
      </p>

      {failed && checkError && <CheckFailedBanner error={checkError} onRetry={() => void run()} />}

      {!check && !failed && <ReviewSkeleton totalRows={upload.total_rows} />}

      {check && !failed && outOfDate && (
        <StaleBanner checking={checking} totalRows={upload.total_rows} onUpdate={() => void run()} />
      )}

      {settingsProblem && (
        <SettingsProblemBanner
          errors={settingsProblem.errors}
          onBackToMapping={() => wizard.goTo("mapping")}
          onBackToOptions={() => wizard.goTo("options")}
        />
      )}

      {checked && numbers && (
        <>
          <ReviewSummary
            numbers={numbers}
            check={checked}
            filter={filter}
            onFilter={(next) => showFilter(next, true)}
            dimmed={outOfDate}
            onGoToOptions={() => wizard.goTo("options")}
            onGoToMapping={() => wizard.goTo("mapping")}
          />

          <div className={`space-y-4 transition-opacity ${outOfDate ? "opacity-60" : ""}`} aria-busy={outOfDate || undefined}>
            <IssuesPanel
              check={checked}
              leftOutRows={leftOutRows}
              saving={exclusions.saving}
              onLeaveOut={(row) => void leaveOut([row])}
            />

            <OwnerMatchPanel
              plan={options.owner_plan}
              summary={checked.owners}
              owners={owners}
              ownersStatus={ownersStatus}
              ownersError={ownersError}
              onRetryOwners={retryOwners}
              onApply={applyOwnerMapping}
            />

            {Object.values(checked.unrecognized ?? {}).some((values) => values.length > 0) && (
              <UnrecognizedValuesPanel
                unrecognized={checked.unrecognized}
                fields={upload.fields}
                savedMapping={options.value_mapping}
                onApply={applyValueMapping}
                onLeaveAllBlank={leaveAllBlank}
              />
            )}

            <DuplicatesCard
              action={options.duplicate_action}
              counts={checked.duplicates_skipped}
              onChange={() => wizard.goTo("options")}
            />
          </div>

          <section id={ROWS_ID} tabIndex={-1} aria-label="Rows in your file" className={`${card} outline-none`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3 py-2.5 sm:px-4">
              <h2 className="mr-auto text-sm font-semibold text-fg">Rows</h2>
              <SearchBox
                key={searchBoxKey}
                value={search}
                onSearchChange={handleSearch}
                placeholder="Search rows"
                ariaLabel="Search rows by name, email, phone or row number"
              />
              <button type="button" className={secondaryButton} onClick={() => setRulesOpen(true)}>
                <SlidersHorizontal size={14} aria-hidden="true" />
                Leave out rows by rule
                {options.exclusions.rules.length > 0 && (
                  <span className="rounded-full bg-slate-light px-1.5 text-xs font-semibold text-slate">
                    {options.exclusions.rules.length}
                  </span>
                )}
              </button>
            </div>

            <div className="border-b border-line px-3 py-2 sm:px-4">
              <ReviewFilterTabs filter={filter} counts={counts} onChange={(next) => showFilter(next)} />
            </div>

            {outOfDate && (
              <p className="border-b border-line bg-amber/10 px-3 py-2 text-xs text-fg sm:px-4">
                These rows are from before your last change. They update when the counts do.
              </p>
            )}

            {filter === "excluded" && (
              <p className="border-b border-line px-3 py-2 text-xs text-ink-soft sm:px-4">
                Include a row again to bring it back. Rows left out by a rule come back only when you change the rule.
              </p>
            )}

            <ReviewBulkBar
              count={selection.selected.size}
              mode={bulkMode}
              busy={exclusions.saving}
              onAction={runBulk}
              onClear={selection.clear}
            />

            {rows.error ? (
              <RowsErrorState error={rows.error} onRetry={rows.reload} />
            ) : !rows.data || rows.showSkeleton ? (
              <RowsSkeleton />
            ) : pageRows.length === 0 ? (
              <RowsEmptyState filter={filter} searching={search !== ""} onShowAll={() => {
                  setSearch("");
                  setSearchBoxKey((key) => key + 1);
                  showFilter("all");
                }}
              />
            ) : (
              <>
                <ReviewRowsTable
                  rows={pageRows}
                  columns={keyColumns}
                  selected={selection.selected}
                  onToggle={selection.toggle}
                  onToggleAll={selection.toggleMany}
                  overrides={activeOverrides}
                  busy={exclusions.saving}
                  dimmed={outOfDate || rows.refreshing}
                  onLeaveOut={(row) => void leaveOut([row])}
                  onInclude={(row) => void includeAgain([row])}
                />
                <ServerPagination
                  pagination={rows.data.pagination}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </>
            )}
          </section>
        </>
      )}

      {rulesOpen && (
        <ExclusionRulesModal
          headers={upload.headers}
          mapping={mapping}
          savedRules={options.exclusions.rules}
          savedSkipErrors={options.exclusions.skip_rows_with_errors}
          lastResult={ruleResult}
          saving={exclusions.saving}
          onSave={saveRules}
          onClose={() => setRulesOpen(false)}
        />
      )}

      <ImportToast toast={toast} />
    </div>
  );
}

