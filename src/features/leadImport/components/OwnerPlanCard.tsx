"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import Switch from "@/shared/components/Switch";
import OptionRadioGroup from "@/features/leadImport/components/OptionRadioCard";
import OwnerChoiceEditor from "@/features/leadImport/components/OwnerChoiceEditor";
import Reveal from "@/features/leadImport/components/Reveal";
import type {
  ImportOptions,
  OwnerMode,
  OwnerPlan,
  OwnerUnmatchedAction,
} from "@/features/leadImport/types/leadImport.types";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { ownerLine } from "@/features/leadImport/utils/optionSummary";
import type { OwnerIssues, OwnersLoad } from "@/features/leadImport/utils/optionRules";

export const OWNER_CARD_ID = "import-options-owner";

interface OwnerPlanCardProps {
  options: ImportOptions;
  owners: LeadOwnerOption[] | null;
  ownersStatus: OwnersLoad;
  ownersError: ImportErrorInfo | null;
  onRetryOwners: () => void;
  hasOwnerColumn: boolean;
  totalRows: number;
  issues: OwnerIssues;
  onPatchPlan: (patch: Partial<OwnerPlan>) => void;
}

function OwnersSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading team members">
      <div className="h-9 w-64 max-w-full animate-shimmer rounded-md" />
      <div className="h-9 w-full max-w-md animate-shimmer rounded-md" />
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{children}</h4>;
}

/** Card 1: who owns the imported leads. */
export default function OwnerPlanCard({
  options,
  owners,
  ownersStatus,
  ownersError,
  onRetryOwners,
  hasOwnerColumn,
  totalRows,
  issues,
  onPatchPlan,
}: OwnerPlanCardProps) {
  const plan = options.owner_plan;
  const ready = ownersStatus === "ready";

  /** The pickers' area: skeleton while loading, a short note if the list failed. */
  function gate(children: React.ReactNode) {
    if (ownersStatus === "loading") return <OwnersSkeleton />;
    if (ownersStatus === "error") {
      return <p className="text-sm text-ink-soft">The team list is not available yet. Try loading it again above.</p>;
    }
    return children;
  }

  return (
    <section id={OWNER_CARD_ID} tabIndex={-1} aria-labelledby="import-options-owner-title" className="scroll-mt-4 rounded-lg border border-line bg-surface p-3 outline-none sm:p-4">
      <h3 id="import-options-owner-title" className="text-sm font-semibold text-fg">
        Who should own these leads?
      </h3>
      <p className="text-xs text-ink-soft">Pick one way. It applies to the whole file.</p>

      {ownersStatus === "error" && ownersError && (
        <div role="alert" className="mt-3 rounded-lg border border-line bg-paper p-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-fg">We could not load your team members</p>
              <p className="mt-0.5 break-words text-fg">{ownersError.message}</p>
              {ownersError.howToFix && <p className="mt-0.5 break-words text-ink-soft">{ownersError.howToFix}</p>}
              <p className="mt-1 text-xs text-ink-soft">You can still give every lead to yourself.</p>
              <button
                type="button"
                onClick={onRetryOwners}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3">
        <OptionRadioGroup<OwnerMode>
          ariaLabel="Who should own these leads?"
          value={plan.mode}
          onChange={(mode) => onPatchPlan({ mode })}
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          options={[
            { value: "me", label: "Me", description: "Every lead will be assigned to you", badge: "Default" },
            {
              value: "from_file",
              label: "Take it from the file",
              description: "Match the owner column to your team",
              disabled: !hasOwnerColumn,
              hint: "Map a column to Lead owner in step 2",
            },
            { value: "selected", label: "Choose owners", description: "One owner or a group in rotation" },
          ]}
        />
      </div>

      {issues.mode && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-fg" role="status">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-dark" aria-hidden="true" />
          {issues.mode}
        </p>
      )}

      <Reveal open={plan.mode === "from_file"}>
        <div className="space-y-4 pt-4">
          <p className="text-sm text-fg">
            We match each owner in your file to a team member, first by email, then by exact full name.
          </p>

          <div className="space-y-2">
            <SubHeading>If the owner is blank or not found</SubHeading>
            <OptionRadioGroup<OwnerUnmatchedAction>
              ariaLabel="If the owner is blank or not found"
              value={plan.on_unmatched}
              onChange={(on_unmatched) => onPatchPlan({ on_unmatched })}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              options={[
                { value: "use_fallback", label: "Add the lead anyway", description: "It goes to the owner you choose below" },
                { value: "error", label: "Reject the row so I can fix it", description: "The row is left out and listed as a problem" },
              ]}
            />
          </div>

          <Reveal open={plan.on_unmatched === "use_fallback"}>
            <div className="space-y-2 pb-1">
              <SubHeading>Who gets those leads?</SubHeading>
              {gate(
                <OwnerChoiceEditor
                  choice={plan.fallback}
                  onChange={(fallback) => onPatchPlan({ fallback })}
                  owners={owners ?? []}
                  labels={{ single: "Use one owner", rotation: "Share in rotation" }}
                  ariaLabel="How to give out leads with no matching owner"
                  issue={issues.fallback}
                  emptyMeansYou
                />,
              )}
            </div>
          </Reveal>

          <p className="text-xs text-ink-soft">You can match individual names from your file to team members in the Review step.</p>
        </div>
      </Reveal>

      <Reveal open={plan.mode === "selected"}>
        <div className="space-y-2 pt-4">
          <SubHeading>Owners</SubHeading>
          {gate(
            <OwnerChoiceEditor
              choice={plan.selected}
              onChange={(selected) => onPatchPlan({ selected })}
              owners={owners ?? []}
              labels={{ single: "One owner", rotation: "Rotation" }}
              ariaLabel="One owner or a rotation"
              issue={issues.selected}
              emptyMeansYou={false}
            />,
          )}
          <p className="text-xs text-ink-soft">The owner column in your file, if there is one, is ignored.</p>
        </div>
      </Reveal>

      {options.duplicate_action === "update" && (
        <div className="mt-4 flex items-start gap-3 border-t border-line pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">Also change the owner of leads that are updated</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Off by default. When off, an updated lead keeps its current owner.
            </p>
          </div>
          <Switch
            checked={plan.change_owner_on_update}
            onChange={(change_owner_on_update) => onPatchPlan({ change_owner_on_update })}
            ariaLabel="Also change the owner of leads that are updated"
            showState
          />
        </div>
      )}

      <p className="mt-4 border-t border-line pt-3 text-sm font-medium text-fg" aria-live="polite">
        {ownerLine(options, ready ? owners : null, totalRows)}
      </p>
    </section>
  );
}
