"use client";

import { AlertTriangle, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import type { OwnerPlan, OwnerSummary } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { ownerSourceLabel } from "@/features/leadImport/utils/labels";
import type { OwnersLoad } from "@/features/leadImport/utils/optionRules";
import { card, linkButton, primaryButton, tableHead } from "@/features/leadImport/utils/reviewStyles";
import { plural } from "@/features/leadImport/utils/reviewSummary";
import Select, { type SelectOption } from "@/shared/components/Select";

const PER_OWNER_SHOWN = 8;
const UNMATCHED_SHOWN = 10;

interface OwnerMatchPanelProps {
  plan: OwnerPlan;
  summary: OwnerSummary;
  owners: LeadOwnerOption[] | null;
  ownersStatus: OwnersLoad;
  ownersError: ImportErrorInfo | null;
  onRetryOwners: () => void;
  /** Saves the new value to owner mapping and checks again. */
  onApply: (mapping: Record<string, string>) => void;
}

function sourceText(bySource: Record<string, number>): string {
  return Object.entries(bySource)
    .filter(([, count]) => count > 0)
    .map(([source, count]) => `${ownerSourceLabel(source)} ${formatCount(count)}`)
    .join(" · ");
}

/**
 * Who the leads will go to. With "owner from the file" it also lists the file
 * values that matched nobody and lets the user pick a team member for each.
 */
export default function OwnerMatchPanel({
  plan,
  summary,
  owners,
  ownersStatus,
  ownersError,
  onRetryOwners,
  onApply,
}: OwnerMatchPanelProps) {
  const matching = plan.mode === "from_file";
  const [showAllOwners, setShowAllOwners] = useState(false);
  const [showAllValues, setShowAllValues] = useState(false);
  // Choices not saved yet: {file value: user id}. An empty string means "clear my choice".
  const [edits, setEdits] = useState<Record<string, string>>({});

  const perOwner = summary.per_owner ?? [];
  const unmatched = summary.unmatched_values ?? [];
  const maxTotal = Math.max(1, ...perOwner.map((owner) => owner.total));
  const visibleOwners = showAllOwners ? perOwner : perOwner.slice(0, PER_OWNER_SHOWN);
  const visibleValues = showAllValues ? unmatched : unmatched.slice(0, UNMATCHED_SHOWN);

  const selectOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Not chosen", muted: true },
      ...(owners ?? []).map((owner) => ({ value: owner.id, label: owner.name, description: owner.email })),
    ],
    [owners],
  );

  const pending = Object.keys(edits).length > 0;

  function choose(value: string, ownerId: string) {
    setEdits((current) => ({ ...current, [value]: ownerId }));
  }

  function apply() {
    const next: Record<string, string> = { ...plan.owner_value_mapping };
    for (const [value, ownerId] of Object.entries(edits)) {
      if (ownerId) next[value] = ownerId;
      else delete next[value];
    }
    setEdits({});
    onApply(next);
  }

  return (
    <section aria-label="Lead owners" className={`${card} p-3 sm:p-4`}>
      <div className="flex items-center gap-2">
        <UserRound size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-fg">{matching ? "Lead owners from your file" : "Lead owners"}</h2>
      </div>

      {perOwner.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">No leads will be given an owner yet.</p>
      ) : (
        <ul className="mt-3 space-y-2" aria-label="Leads per owner">
          {visibleOwners.map((owner) => (
            <li key={owner.owner_id} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium text-fg" title={owner.email}>
                  {owner.name}
                </span>
                <span className="shrink-0 tabular-nums text-fg">
                  {formatCount(owner.total)} {plural(owner.total, "lead", "leads")}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden="true">
                <div className="h-full rounded-full bg-slate" style={{ width: `${Math.max(2, (owner.total / maxTotal) * 100)}%` }} />
              </div>
              {matching && sourceText(owner.by_source) && (
                <p className="mt-0.5 text-xs text-ink-soft">{sourceText(owner.by_source)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {perOwner.length > PER_OWNER_SHOWN && (
        <button type="button" className={`${linkButton} mt-2`} onClick={() => setShowAllOwners((value) => !value)}>
          {showAllOwners ? "Show fewer owners" : `Show all ${perOwner.length} owners`}
        </button>
      )}

      {matching && summary.rejected > 0 && (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {formatCount(summary.rejected)} {plural(summary.rejected, "row is", "rows are")} rejected because no owner could
            be found. Choose a team member below, or change what happens in the options.
          </span>
        </p>
      )}

      {matching && unmatched.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <h3 className="text-sm font-semibold text-fg">Names in your file we could not match</h3>
          <p className="mt-0.5 text-xs text-ink-soft">Pick the team member each name belongs to. Your choice applies to every row with that name.</p>

          {ownersStatus === "error" && (
            <div role="alert" className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              <p className="font-medium">{ownersError?.message ?? "We could not load your team members."}</p>
              {ownersError?.howToFix && <p className="mt-0.5">{ownersError.howToFix}</p>}
              <button type="button" className={`${linkButton} mt-1 !text-danger`} onClick={onRetryOwners}>
                Try again
              </button>
            </div>
          )}

          <div className="mt-2 overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[620px] text-left text-sm">
              <caption className="sr-only">File values that matched no team member</caption>
              <thead>
                <tr className={`border-b border-line bg-paper ${tableHead}`}>
                  <th scope="col" className="px-3 py-2">File value</th>
                  <th scope="col" className="px-3 py-2 text-right">Rows</th>
                  <th scope="col" className="px-3 py-2 text-right">First row</th>
                  <th scope="col" className="px-3 py-2">What happens now</th>
                  <th scope="col" className="px-3 py-2">Team member</th>
                </tr>
              </thead>
              <tbody>
                {visibleValues.map((item) => {
                  const chosen = edits[item.value] ?? plan.owner_value_mapping[item.value] ?? "";
                  const fallbackNames = item.fell_back_to.map((target) => target.name).filter(Boolean);
                  let outcome: string;
                  if (item.rejected) outcome = "Row rejected";
                  else if (fallbackNames.length === 1) outcome = `Goes to ${fallbackNames[0]}`;
                  else if (fallbackNames.length > 1) outcome = `Goes to ${fallbackNames[0]} and ${fallbackNames.length - 1} more`;
                  else outcome = "Goes to the fallback owner";
                  return (
                    <tr key={item.value} className="border-b border-line align-middle last:border-0">
                      <td className="max-w-[14rem] break-words px-3 py-2 font-medium text-fg">
                        {item.value.trim() === "" ? "(blank)" : item.value}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-fg">{formatCount(item.count)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{item.first_row}</td>
                      <td className="px-3 py-2">
                        {item.rejected ? (
                          <span className="inline-flex items-center gap-1 text-danger">
                            <AlertTriangle size={12} aria-hidden="true" />
                            {outcome}
                          </span>
                        ) : (
                          <span className="text-ink-soft">{outcome}</span>
                        )}
                      </td>
                      <td className="w-56 px-3 py-2">
                        <Select
                          size="sm"
                          value={chosen}
                          options={selectOptions}
                          onChange={(next) => choose(item.value, next)}
                          disabled={ownersStatus !== "ready"}
                          placeholder={ownersStatus === "loading" ? "Loading team..." : "Choose a team member"}
                          ariaLabel={`Team member for the file value ${item.value || "blank"}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" className={primaryButton} disabled={!pending} onClick={apply}>
              Apply and check again
            </button>
            {unmatched.length > UNMATCHED_SHOWN && (
              <button type="button" className={linkButton} onClick={() => setShowAllValues((value) => !value)}>
                {showAllValues ? "Show fewer names" : `Show all ${unmatched.length} names`}
              </button>
            )}
            {!pending && <span className="text-xs text-ink-soft">Choose a team member to enable this.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
