/** Copy and structure shared by the auth brand panel and the compact header. */

export const BRAND_HEADLINE_LINES = ["Know where", "every lead stands."] as const;

export const BRAND_VALUE_LINE =
  "Follow each lead from first contact to conversion, with its owner, activities and reminders together.";

/** One-line version for the compact mobile header. */
export const BRAND_VALUE_LINE_SHORT = "Know where every lead stands.";

/** Pipeline stages, bottom of the stack to top. Mirrors the lead statuses. */
export const PIPELINE_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Won",
] as const;

export type ProofPointIcon = "owner" | "activity" | "reminder";

export interface ProofPoint {
  icon: ProofPointIcon;
  text: string;
}

export const PROOF_POINTS: readonly ProofPoint[] = [
  { icon: "owner", text: "Every lead has an owner" },
  { icon: "activity", text: "Calls, meetings and tasks on one record" },
  { icon: "reminder", text: "Reminders before a follow-up slips" },
];
