import type { WizardStep } from "@/features/leadImport/hooks/useLeadImportWizard";

export type StepFooterTone = "neutral" | "success" | "warning";

/**
 * What a step tells the wizard's footer: whether Continue works, why not,
 * and a one-line status. `step` lets the shell ignore a footer that belongs
 * to a screen that has just been left.
 */
export interface StepFooter {
  step: WizardStep;
  canContinue: boolean;
  /** Shown as a tooltip and in the status line while Continue is disabled. */
  reason: string | null;
  /** One line, e.g. "3 warnings" or "Ready to continue". */
  status: string;
  tone: StepFooterTone;
  /** Defaults to "Continue". */
  continueLabel?: string;
}
