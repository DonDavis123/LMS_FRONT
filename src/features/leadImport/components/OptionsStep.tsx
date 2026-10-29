"use client";

import type { LeadImportWizard } from "@/features/leadImport/hooks/useLeadImportWizard";
import { useLeadOwners } from "@/features/leadImport/hooks/useLeadOwners";
import { useStepFooter } from "@/features/leadImport/hooks/useStepFooter";
import DataHandlingCard from "@/features/leadImport/components/DataHandlingCard";
import DuplicateActionCard from "@/features/leadImport/components/DuplicateActionCard";
import OptionsSummaryCard from "@/features/leadImport/components/OptionsSummaryCard";
import OwnerPlanCard from "@/features/leadImport/components/OwnerPlanCard";
import type { DuplicateAction, ImportOptions, OwnerPlan } from "@/features/leadImport/types/leadImport.types";
import { CONVERTED_FIELD, OWNER_FIELD, isFieldMapped } from "@/features/leadImport/utils/mappingRules";
import { firstOwnerIssue, validateOwnerPlan } from "@/features/leadImport/utils/optionRules";
import type { StepFooter } from "@/features/leadImport/utils/stepFooter";

interface OptionsStepProps {
  wizard: LeadImportWizard;
  onFooterChange: (footer: StepFooter | null) => void;
}

/** Step 3: who owns the leads, what happens to duplicates, and how cells are read. Makes no API call of its own. */
export default function OptionsStep({ wizard, onFooterChange }: OptionsStepProps) {
  const { state } = wizard;
  const { upload, mapping, options } = state;
  const plan = options.owner_plan;

  const { owners, status, error, retry } = useLeadOwners(state.owners, wizard.setOwners);

  const hasOwnerColumn = isFieldMapped(mapping, OWNER_FIELD);
  const hasConvertedColumn = isFieldMapped(mapping, CONVERTED_FIELD);
  const totalRows = upload?.total_rows ?? 0;

  /** Every change goes through here: it saves the option and marks the full check as out of date. */
  function patch(change: Partial<ImportOptions>) {
    wizard.patchOptions(change);
    wizard.markStale();
  }

  function patchPlan(change: Partial<OwnerPlan>) {
    patch({ owner_plan: { ...plan, ...change } });
  }

  function changeDuplicateAction(action: DuplicateAction) {
    // "Change owner on update" only exists under Update, so it is switched off when leaving it.
    if (action !== "update" && plan.change_owner_on_update) {
      patch({ duplicate_action: action, owner_plan: { ...plan, change_owner_on_update: false } });
    } else {
      patch({ duplicate_action: action });
    }
  }

  function scrollToCard(id: string) {
    const element = document.getElementById(id);
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    element.focus({ preventScroll: true });
  }

  /* ---------------- validation and footer ---------------- */

  const issues = validateOwnerPlan(options, owners, hasOwnerColumn);
  const needsOwners = plan.mode === "selected" || (plan.mode === "from_file" && plan.on_unmatched === "use_fallback");
  const reason =
    status === "loading" && needsOwners ? "Loading your team members…" : firstOwnerIssue(issues);

  useStepFooter(
    {
      step: "options",
      canContinue: reason === null,
      reason,
      status: reason ?? "Ready to check your file",
      tone: reason ? "warning" : "success",
      continueLabel: "Check my file",
    },
    onFooterChange,
  );

  if (!upload) return null;

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">Choose your options</h2>
        <p className="text-xs text-ink-soft">
          These choices apply to the whole file. Nothing is added until you review and start the import.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <OwnerPlanCard
            options={options}
            owners={owners}
            ownersStatus={status}
            ownersError={error}
            onRetryOwners={retry}
            hasOwnerColumn={hasOwnerColumn}
            totalRows={totalRows}
            issues={issues}
            onPatchPlan={patchPlan}
          />
          <DuplicateActionCard value={options.duplicate_action} onChange={changeDuplicateAction} />
          <DataHandlingCard options={options} hasConvertedColumn={hasConvertedColumn} onPatch={patch} />
        </div>

        <OptionsSummaryCard
          options={options}
          owners={owners}
          totalRows={totalRows}
          hasConvertedColumn={hasConvertedColumn}
          onEdit={scrollToCard}
        />
      </div>
    </div>
  );
}
