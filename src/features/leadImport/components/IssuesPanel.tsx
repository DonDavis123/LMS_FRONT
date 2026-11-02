"use client";

import { AlertTriangle, ChevronDown, EyeOff } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useImportPicklists } from "@/features/leadImport/hooks/useImportPicklists";
import {
  BLANK_VALUE,
  type ImportFieldDef,
  type RowProblem,
  type ValidateChecked,
} from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { card, linkButton, primaryButton, secondaryButton, smallButton, tableHead } from "@/features/leadImport/utils/reviewStyles";
import { plural } from "@/features/leadImport/utils/reviewSummary";
import Select, { type SelectOption } from "@/shared/components/Select";

type ValueMapping = Record<string, Record<string, string>>;

const PAGE_SIZE = 10;
const ALL_COLUMNS = "";
const ROW_PREFIX = /^Row \d+:\s*/i;

interface IssuesPanelProps {
  check: ValidateChecked;
  fields: ImportFieldDef[];
  /** options.value_mapping as saved. */
  savedMapping: ValueMapping;
  /** Rows already left out by number, so their button shows as done. */
  leftOutRows: ReadonlySet<number>;
  saving: boolean;
  onLeaveOut: (rows: number[]) => void;
  /** Saves the new dropdown mapping and checks again. */
  onApplyMapping: (mapping: ValueMapping) => void;
  /** Sets options.unknown_values_as_blank and checks again. */
  onLeaveAllBlank: () => void;
}

/** One line of the table: a column and a value in it that has a problem. */
interface Issue {
  id: string;
  /** Set when the value can be matched to one of the company's dropdown options. */
  optionField: string | null;
  column: string;
  value: string;
  /** How many rows have this value. */
  count: number;
  /** Row numbers the check told us about (it lists the first 20 problems only). */
  rowNumbers: number[];
  message: string;
  howToFix: string;
  suggestions: string[];
}

/** Same comparison the backend uses for dropdown values. */
function loose(value: string): string {
  return value.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
}

function shown(value: string): string {
  return value.trim() === "" ? "(blank)" : value;
}

function cleanMessage(message: string): string {
  return message.replace(ROW_PREFIX, "");
}

/**
 * Everything the check found, in one table: which column, which value, what is
 * wrong and how to fix it. Dropdown values can be matched right in the line;
 * other problems can be fixed in the file or by leaving the row out.
 */
export default function IssuesPanel({
  check,
  fields,
  savedMapping,
  leftOutRows,
  saving,
  onLeaveOut,
  onApplyMapping,
  onLeaveAllBlank,
}: IssuesPanelProps) {
  const groups = check.error_groups ?? [];
  const problems = useMemo(() => check.problems ?? [], [check.problems]);
  const unrecognized = useMemo(() => check.unrecognized ?? {}, [check.unrecognized]);

  const issues = useMemo<Issue[]>(() => {
    const labelFor = (key: string) => fields.find((field) => field.key === key)?.label ?? key;
    const byOption = new Map<string, RowProblem[]>();
    const rest = new Map<string, Issue>();
    const optionKeys = new Set<string>();

    for (const [field, values] of Object.entries(unrecognized)) {
      for (const item of values ?? []) optionKeys.add(`${field}\u0000${loose(item.value)}`);
    }
    for (const problem of problems) {
      const key = `${problem.field}\u0000${loose(problem.value)}`;
      if (optionKeys.has(key)) {
        byOption.set(key, [...(byOption.get(key) ?? []), problem]);
        continue;
      }
      const groupKey = `${problem.field}\u0000${problem.code}\u0000${loose(problem.value)}`;
      const existing = rest.get(groupKey);
      if (existing) {
        existing.rowNumbers.push(problem.row_number);
        existing.count += 1;
      } else {
        rest.set(groupKey, {
          id: groupKey,
          optionField: null,
          column: problem.column || labelFor(problem.field),
          value: problem.value,
          count: 1,
          rowNumbers: [problem.row_number],
          message: cleanMessage(problem.message),
          howToFix: problem.how_to_fix,
          suggestions: [],
        });
      }
    }

    const list: Issue[] = [];
    for (const [field, values] of Object.entries(unrecognized)) {
      for (const item of values ?? []) {
        const matched = byOption.get(`${field}\u0000${loose(item.value)}`) ?? [];
        list.push({
          id: `option\u0000${field}\u0000${item.value}`,
          optionField: field,
          column: matched[0]?.column || labelFor(field),
          value: item.value,
          count: item.count,
          rowNumbers: matched.map((problem) => problem.row_number),
          message: "Not one of your dropdown options.",
          howToFix: "Match it to an option, or leave it blank.",
          suggestions: item.suggestions ?? [],
        });
      }
    }
    list.push(...rest.values());
    return list.sort((a, b) => a.column.localeCompare(b.column) || b.count - a.count || a.value.localeCompare(b.value));
  }, [fields, problems, unrecognized]);

  const optionIssues = issues.filter((issue) => issue.optionField !== null);
  const hasOptionIssues = optionIssues.length > 0;
  const { lists, status, retry } = useImportPicklists(hasOptionIssues);

  const groupTotal = groups.reduce((sum, group) => sum + group.count, 0);
  const unmatchedTotal = optionIssues.reduce((sum, issue) => sum + issue.count, 0);
  const total = Math.max(groupTotal, problems.length, unmatchedTotal);
  const hasErrors = total > 0 || issues.length > 0;

  const [open, setOpen] = useState(hasErrors);
  // Opens by itself when problems appear; the user's own open/close is kept otherwise.
  useEffect(() => {
    if (hasErrors) setOpen(true);
  }, [hasErrors]);
  const bodyId = useId();

  // Choices not saved yet: {field: {file value: option | "__blank__" | ""}}. "" clears a saved choice.
  const [edits, setEdits] = useState<ValueMapping>({});
  const [columnFilter, setColumnFilter] = useState(ALL_COLUMNS);
  const [shownCount, setShownCount] = useState(PAGE_SIZE);
  const pending = Object.values(edits).some((forField) => Object.keys(forField).length > 0);

  const columns = useMemo(() => Array.from(new Set(issues.map((issue) => issue.column))), [issues]);
  const visibleAll = columnFilter === ALL_COLUMNS ? issues : issues.filter((issue) => issue.column === columnFilter);
  // A filter that no longer matches anything (after checking again) shows everything.
  const filtered = visibleAll.length > 0 || columnFilter === ALL_COLUMNS ? visibleAll : issues;
  const visible = filtered.slice(0, shownCount);

  function optionsFor(field: string): SelectOption[] {
    const names = (lists as unknown as Record<string, string[] | undefined> | null)?.[field] ?? [];
    return [
      { value: "", label: "Not chosen", muted: true },
      { value: BLANK_VALUE, label: "Leave blank" },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }

  function current(field: string, value: string): string {
    return edits[field]?.[value] ?? savedMapping[field]?.[value] ?? "";
  }

  function choose(field: string, value: string, choice: string) {
    setEdits((all) => ({ ...all, [field]: { ...(all[field] ?? {}), [value]: choice } }));
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
    onApplyMapping(next);
  }

  const columnOptions: SelectOption[] = [
    { value: ALL_COLUMNS, label: `All columns (${columns.length})` },
    ...columns.map((column) => ({ value: column, label: column })),
  ];

  return (
    <section aria-label="Problems found" className={`${card} min-w-0`}>
      <h2 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber sm:px-4"
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-ink-soft transition-transform motion-reduce:transition-none ${open ? "" : "-rotate-90"}`}
          />
          <span className="text-sm font-semibold text-fg">Problems to fix</span>
          {hasErrors ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
              <AlertTriangle size={12} aria-hidden="true" />
              {formatCount(total)} {plural(total, "problem", "problems")}
            </span>
          ) : (
            <span className="text-xs text-ink-soft">None found</span>
          )}
        </button>
      </h2>

      {open && (
        <div id={bodyId} className="space-y-3 border-t border-line px-3 py-3 sm:px-4">
          {!hasErrors && <p className="text-sm text-ink-soft">No problems were found in the rows that will be imported.</p>}

          {groups.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Problems by type">
              {groups.map((group) => (
                <li
                  key={group.code}
                  className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-xs font-medium text-fg"
                >
                  {group.label}
                  <span className="ml-1.5 tabular-nums text-ink-soft">
                    {formatCount(group.count)} {plural(group.count, "row", "rows")}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {hasOptionIssues && status === "error" && (
            <div role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              <p className="font-medium">We could not load your dropdown options.</p>
              <p className="mt-0.5">Check your connection, then try again. You can still leave values blank.</p>
              <button type="button" className={`${linkButton} mt-1 !text-danger`} onClick={retry}>
                Try again
              </button>
            </div>
          )}

          {issues.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <p className="text-xs text-ink-soft">
                  {hasOptionIssues
                    ? "Match dropdown values to one of your options, or leave them blank. Fix the other problems in your file, or leave those rows out."
                    : "Fix these in your file, or leave the rows out."}
                </p>
                {columns.length > 1 && (
                  <div className="w-full sm:w-52">
                    <Select
                      size="sm"
                      value={columnFilter}
                      options={columnOptions}
                      onChange={(next) => {
                        setColumnFilter(next);
                        setShownCount(PAGE_SIZE);
                      }}
                      ariaLabel="Show problems for column"
                    />
                  </div>
                )}
              </div>

              <div className="max-h-[26rem] overflow-auto rounded-md border border-line">
                <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                  <caption className="sr-only">Columns and values with problems, what is wrong and how to fix each one</caption>
                  <colgroup>
                    <col className="w-[13%]" />
                    <col className="w-[17%]" />
                    <col className="w-[8%]" />
                    <col className="w-[19%]" />
                    <col className="w-[20%]" />
                    <col className="w-[23%]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10">
                    <tr className={`border-b border-line bg-paper ${tableHead}`}>
                      <th scope="col" className="px-3 py-2">Column</th>
                      <th scope="col" className="px-3 py-2">Value in file</th>
                      <th scope="col" className="px-3 py-2">Rows</th>
                      <th scope="col" className="px-3 py-2">What is wrong</th>
                      <th scope="col" className="px-3 py-2">How to fix</th>
                      <th scope="col" className="px-3 py-2">Fix it here</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((issue) => {
                      const field = issue.optionField;
                      const chosen = field ? current(field, issue.value) : "";
                      const allLeftOut = issue.rowNumbers.length > 0 && issue.rowNumbers.every((row) => leftOutRows.has(row));
                      const toLeave = issue.rowNumbers.filter((row) => !leftOutRows.has(row));
                      return (
                        <tr key={issue.id} className="border-b border-line align-top last:border-0">
                          <td className="break-words px-3 py-2.5 font-medium text-fg">{issue.column || "—"}</td>
                          <td className="break-words px-3 py-2.5 text-fg">{shown(issue.value)}</td>
                          <td className="px-3 py-2.5 tabular-nums text-ink-soft">{formatCount(issue.count)}</td>
                          <td className="px-3 py-2.5 text-fg">{issue.message}</td>
                          <td className="px-3 py-2.5 text-ink-soft">
                            <p className="break-words">{issue.howToFix || "—"}</p>
                            {issue.suggestions.length > 0 && field && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="text-xs">Did you mean:</span>
                                {issue.suggestions.map((suggestion) => (
                                  <button
                                    key={suggestion}
                                    type="button"
                                    aria-pressed={chosen === suggestion}
                                    onClick={() => choose(field, issue.value, suggestion)}
                                    className={`rounded-full border px-2 py-0.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber ${
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
                          </td>
                          <td className="px-3 py-2.5">
                            {field ? (
                              <Select
                                size="sm"
                                value={chosen}
                                options={optionsFor(field)}
                                onChange={(next) => choose(field, issue.value, next)}
                                disabled={status === "loading"}
                                ariaLabel={`Option for ${issue.column} value ${issue.value || "blank"}`}
                              />
                            ) : allLeftOut ? (
                              <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                                <EyeOff size={12} aria-hidden="true" />
                                Left out
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={smallButton}
                                disabled={saving || toLeave.length === 0}
                                onClick={() => onLeaveOut(toLeave)}
                                aria-label={`Leave ${toLeave.length === 1 ? "row" : "rows"} with ${shown(issue.value)} in ${issue.column} out`}
                              >
                                {toLeave.length > 1 ? `Leave ${toLeave.length} rows out` : "Leave row out"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <p className="text-xs text-ink-soft">
                  Showing {formatCount(visible.length)} of {formatCount(filtered.length)}{" "}
                  {plural(filtered.length, "value", "values")}.
                  {total > problems.length && unmatchedTotal === 0 && " The rows table below lists every problem."}
                </p>
                {filtered.length > visible.length && (
                  <button type="button" className={linkButton} onClick={() => setShownCount((count) => count + PAGE_SIZE)}>
                    Show more
                  </button>
                )}
                {shownCount > PAGE_SIZE && filtered.length <= visible.length && (
                  <button type="button" className={linkButton} onClick={() => setShownCount(PAGE_SIZE)}>
                    Show fewer
                  </button>
                )}
              </div>
            </>
          )}

          {hasOptionIssues && (
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <button type="button" className={primaryButton} disabled={!pending || saving} onClick={apply}>
                Apply and check again
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={onLeaveAllBlank}
                title="Rows keep going; these cells are left empty."
              >
                Leave all unmatched blank
              </button>
              {!pending && <span className="text-xs text-ink-soft">Choose an option for at least one value to apply.</span>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
