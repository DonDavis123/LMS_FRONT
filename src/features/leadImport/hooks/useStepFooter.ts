import { useEffect } from "react";
import type { StepFooter } from "@/features/leadImport/utils/stepFooter";

/** Reports a step's footer state to the wizard shell, and clears it when the step closes. */
export function useStepFooter(footer: StepFooter, onFooterChange: (footer: StepFooter | null) => void) {
  const { step, canContinue, reason, status, tone, continueLabel } = footer;

  useEffect(() => {
    onFooterChange({ step, canContinue, reason, status, tone, continueLabel });
  }, [onFooterChange, step, canContinue, reason, status, tone, continueLabel]);

  useEffect(() => () => onFooterChange(null), [onFooterChange]);
}
