import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import type { ImportOptions, OwnerChoice } from "@/features/leadImport/types/leadImport.types";

export const MIN_ROTATION_OWNERS = 2;

export interface OwnerIssues {
  /** The chosen mode cannot be used at all (no owner column mapped). */
  mode: string | null;
  /** Problem with the "Choose owners" setup. */
  selected: string | null;
  /** Problem with the "blank or not found" fallback. */
  fallback: string | null;
}

export type OwnersLoad = "loading" | "ready" | "error";

const TEAM_UNAVAILABLE = "The team list could not be loaded, so owners cannot be chosen right now.";

/** Checks one choice. `requireExplicit` demands a named owner instead of "you". */
export function validateChoice(
  choice: OwnerChoice,
  owners: LeadOwnerOption[] | null,
  requireExplicit: boolean,
): string | null {
  const known = new Set((owners ?? []).map((owner) => owner.id));

  if (choice.kind === "round_robin") {
    const ids = choice.owner_ids;
    if (ids.length > 0 && owners === null) return TEAM_UNAVAILABLE;
    if (ids.some((id) => !known.has(id))) {
      return "Someone you chose is no longer available as an owner. Remove them to continue.";
    }
    if (new Set(ids).size < MIN_ROTATION_OWNERS) return `Choose at least ${MIN_ROTATION_OWNERS} owners to share leads in rotation.`;
    return null;
  }

  if (!choice.owner_id) return requireExplicit ? "Choose an owner to continue." : null;
  if (owners === null) return TEAM_UNAVAILABLE;
  if (!known.has(choice.owner_id)) return "That person is no longer available as an owner. Choose someone else.";
  return null;
}

/** The same checks the server makes, so Continue is only enabled for a plan it will accept. */
export function validateOwnerPlan(
  options: ImportOptions,
  owners: LeadOwnerOption[] | null,
  hasOwnerColumn: boolean,
): OwnerIssues {
  const plan = options.owner_plan;
  const issues: OwnerIssues = { mode: null, selected: null, fallback: null };

  if (plan.mode === "from_file") {
    if (!hasOwnerColumn) {
      issues.mode = "No column is mapped to Lead owner. Map one in step 2, or choose another option.";
    }
    if (plan.on_unmatched === "use_fallback") issues.fallback = validateChoice(plan.fallback, owners, false);
  } else if (plan.mode === "selected") {
    issues.selected = validateChoice(plan.selected, owners, true);
  }
  return issues;
}

export function firstOwnerIssue(issues: OwnerIssues): string | null {
  return issues.mode ?? issues.selected ?? issues.fallback;
}

export function ownerName(owners: LeadOwnerOption[] | null, id: string | null): string | null {
  if (!id) return null;
  return owners?.find((owner) => owner.id === id)?.name ?? null;
}

/** Switching between "one owner" and "rotation" keeps the first person, so nothing is lost by accident. */
export function switchChoiceKind(choice: OwnerChoice, kind: OwnerChoice["kind"]): OwnerChoice {
  if (kind === choice.kind) return choice;
  if (kind === "round_robin") {
    return { kind, owner_id: null, owner_ids: choice.owner_id ? [choice.owner_id] : [] };
  }
  return { kind, owner_id: choice.owner_ids[0] ?? null, owner_ids: [] };
}
