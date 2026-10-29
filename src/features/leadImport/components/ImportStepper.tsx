"use client";

import { Check } from "lucide-react";
import { WIZARD_STEPS, stepIndex, type WizardStep } from "@/features/leadImport/hooks/useLeadImportWizard";

interface ImportStepperProps {
  current: WizardStep;
  /** Whether the user may jump to this step (it must also be an earlier step to be clickable). */
  canGoTo: (step: WizardStep) => boolean;
  onSelect: (step: WizardStep) => void;
}

type StepState = "done" | "current" | "locked";

export default function ImportStepper({ current, canGoTo, onSelect }: ImportStepperProps) {
  const currentIndex = stepIndex(current);
  const total = WIZARD_STEPS.length;
  const currentLabel = WIZARD_STEPS[currentIndex]?.label ?? "";

  function stateOf(index: number): StepState {
    if (index === currentIndex) return "current";
    return index < currentIndex ? "done" : "locked";
  }

  return (
    <nav aria-label="Import progress">
      {/* Small screens: a compact bar */}
      <div className="md:hidden">
        <p className="text-sm font-semibold text-fg">
          Step {currentIndex + 1} of {total}: {currentLabel}
        </p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {WIZARD_STEPS.map((step, index) => (
            <span
              key={step.id}
              className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? "bg-amber" : "bg-line"}`}
            />
          ))}
        </div>
      </div>

      {/* md and up: numbered steps joined by a line */}
      <ol className="hidden items-center md:flex">
        {WIZARD_STEPS.map((step, index) => {
          const state = stateOf(index);
          const clickable = state === "done" && canGoTo(step.id);
          const isLast = index === total - 1;

          const circle = (
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                state === "current"
                  ? "border-amber bg-amber text-fg"
                  : state === "done"
                    ? "border-slate bg-slate-light text-slate"
                    : "border-line bg-surface text-ink-soft"
              }`}
            >
              {state === "done" ? <Check size={14} aria-hidden="true" /> : index + 1}
            </span>
          );
          const label = (
            <span
              className={`whitespace-nowrap text-sm ${
                state === "current" ? "font-semibold text-fg" : state === "done" ? "font-medium text-fg" : "text-ink-soft"
              }`}
            >
              {step.label}
            </span>
          );

          return (
            <li
              key={step.id}
              aria-current={state === "current" ? "step" : undefined}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-amber"
                >
                  {circle}
                  {label}
                  <span className="sr-only"> (completed, go back to this step)</span>
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  {circle}
                  {label}
                  {state === "locked" && <span className="sr-only"> (not available yet)</span>}
                </span>
              )}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`mx-3 h-px flex-1 ${index < currentIndex ? "bg-slate" : "bg-line"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
