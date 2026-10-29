"use client";

import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import OwnerPicker from "@/shared/components/OwnerPicker";
import OwnerMultiPicker from "@/features/leadImport/components/OwnerMultiPicker";
import SegmentedControl from "@/features/leadImport/components/SegmentedControl";
import type { OwnerChoice } from "@/features/leadImport/types/leadImport.types";
import { ownerName, switchChoiceKind } from "@/features/leadImport/utils/optionRules";

interface OwnerChoiceEditorProps {
  choice: OwnerChoice;
  onChange: (choice: OwnerChoice) => void;
  owners: LeadOwnerOption[];
  /** Names of the two ways to choose. */
  labels: { single: string; rotation: string };
  ariaLabel: string;
  issue: string | null;
  /** Without a named owner, "one owner" means the person importing. */
  emptyMeansYou: boolean;
}

/** Choose one owner, or a group who take turns. Used for "Choose owners" and for the fallback owner. */
export default function OwnerChoiceEditor({
  choice,
  onChange,
  owners,
  labels,
  ariaLabel,
  issue,
  emptyMeansYou,
}: OwnerChoiceEditorProps) {
  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel={ariaLabel}
        value={choice.kind}
        onChange={(kind) => onChange(switchChoiceKind(choice, kind))}
        options={[
          { value: "single", label: labels.single },
          { value: "round_robin", label: labels.rotation },
        ]}
      />

      {choice.kind === "single" ? (
        <div className="max-w-md space-y-1.5">
          <OwnerPicker
            owners={owners}
            value={choice.owner_id ?? ""}
            label={ownerName(owners, choice.owner_id) ?? ""}
            placeholder={emptyMeansYou ? "You (the person importing)" : "Choose an owner…"}
            onChange={(id) => onChange({ kind: "single", owner_id: id, owner_ids: [] })}
          />
          {emptyMeansYou && choice.owner_id && (
            <button
              type="button"
              onClick={() => onChange({ kind: "single", owner_id: null, owner_ids: [] })}
              className="rounded text-xs font-semibold text-slate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              Use me instead
            </button>
          )}
          {issue && (
            <p className="text-xs text-fg" role="status">
              {issue}
            </p>
          )}
        </div>
      ) : (
        <div className="max-w-xl">
          <OwnerMultiPicker
            owners={owners}
            selectedIds={choice.owner_ids}
            onChange={(ids) => onChange({ kind: "round_robin", owner_id: null, owner_ids: ids })}
            issue={issue}
            ariaLabel={`${labels.rotation}: owners`}
          />
        </div>
      )}
    </div>
  );
}
