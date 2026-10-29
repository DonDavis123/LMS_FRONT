import { useCallback, useMemo, useReducer } from "react";
import {
  IGNORE_COLUMN,
  createDefaultImportOptions,
  type ImportMapping,
  type ImportOptions,
  type MappingPreviewResponse,
  type ProgressResult,
  type UploadResponse,
  type ValidateResponse,
} from "@/features/leadImport/types/leadImport.types";

export type WizardStep = "upload" | "mapping" | "options" | "review" | "import";

export const WIZARD_STEPS: ReadonlyArray<{ id: WizardStep; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "mapping", label: "Map columns" },
  { id: "options", label: "Options" },
  { id: "review", label: "Review" },
  { id: "import", label: "Import" },
];

export function stepIndex(step: WizardStep): number {
  return WIZARD_STEPS.findIndex((item) => item.id === step);
}

export interface WizardState {
  step: WizardStep;
  /** The furthest step the user has unlocked. goTo() refuses anything beyond it. */
  furthest: WizardStep;
  upload: UploadResponse | null;
  /** The chosen File, kept so settings can be re-applied without choosing it again. */
  file: File | null;
  mapping: ImportMapping;
  options: ImportOptions;
  preview: MappingPreviewResponse | null;
  check: ValidateResponse | null;
  /** True after any mapping, option or exclusion change since `check` was made. */
  checkIsStale: boolean;
  progress: ProgressResult | null;
}

type Action =
  | { type: "setUpload"; upload: UploadResponse; file: File | null }
  | { type: "setMapping"; mapping: ImportMapping }
  | { type: "patchOptions"; patch: Partial<ImportOptions> }
  | { type: "setPreview"; preview: MappingPreviewResponse | null }
  | { type: "setCheck"; check: ValidateResponse | null }
  | { type: "markStale" }
  | { type: "setProgress"; progress: ProgressResult | null }
  | { type: "unlock"; step: WizardStep }
  | { type: "goTo"; step: WizardStep }
  | { type: "reset" };

/** For every header: the suggested field, or IGNORE_COLUMN when there is none. */
export function buildStartingMapping(upload: UploadResponse): ImportMapping {
  const mapping: ImportMapping = {};
  for (const header of upload.headers) {
    mapping[header] = upload.suggested_mapping[header]?.field ?? IGNORE_COLUMN;
  }
  return mapping;
}

function createInitialState(): WizardState {
  return {
    step: "upload",
    furthest: "upload",
    upload: null,
    file: null,
    mapping: {},
    options: createDefaultImportOptions(),
    preview: null,
    check: null,
    checkIsStale: false,
    progress: null,
  };
}

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "setUpload":
      // A new upload always starts the later steps from scratch, so nothing
      // from an earlier file or settings can leak into the new draft.
      return {
        ...createInitialState(),
        step: "upload",
        furthest: "mapping",
        upload: action.upload,
        file: action.file,
        mapping: buildStartingMapping(action.upload),
      };
    case "setMapping":
      return { ...state, mapping: action.mapping, checkIsStale: true };
    case "patchOptions":
      return { ...state, options: { ...state.options, ...action.patch }, checkIsStale: true };
    case "setPreview":
      return { ...state, preview: action.preview };
    case "setCheck":
      return { ...state, check: action.check, checkIsStale: false };
    case "markStale":
      return { ...state, checkIsStale: true };
    case "setProgress":
      return { ...state, progress: action.progress };
    case "unlock":
      return stepIndex(action.step) > stepIndex(state.furthest) ? { ...state, furthest: action.step } : state;
    case "goTo":
      return stepIndex(action.step) <= stepIndex(state.furthest) ? { ...state, step: action.step } : state;
    case "reset":
      return createInitialState();
    default:
      return state;
  }
}

/**
 * Owns the whole import wizard state. No UI and no API calls: components
 * and services do that and report the results here.
 */
export function useLeadImportWizard() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  /** Stores an upload with its starting mapping and resets every later step. */
  const setUpload = useCallback(
    (upload: UploadResponse, file: File | null = null) => dispatch({ type: "setUpload", upload, file }),
    [],
  );
  const setMapping = useCallback((mapping: ImportMapping) => dispatch({ type: "setMapping", mapping }), []);
  const patchOptions = useCallback((patch: Partial<ImportOptions>) => dispatch({ type: "patchOptions", patch }), []);
  const setPreview = useCallback((preview: MappingPreviewResponse | null) => dispatch({ type: "setPreview", preview }), []);
  const setCheck = useCallback((check: ValidateResponse | null) => dispatch({ type: "setCheck", check }), []);
  const markStale = useCallback(() => dispatch({ type: "markStale" }), []);
  const setProgress = useCallback((progress: ProgressResult | null) => dispatch({ type: "setProgress", progress }), []);
  /** Lets the user reach `step` (and any step before it). Later parts call this when a step is complete. */
  const unlock = useCallback((step: WizardStep) => dispatch({ type: "unlock", step }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  const canGoTo = useCallback(
    (step: WizardStep) => stepIndex(step) <= stepIndex(state.furthest),
    [state.furthest],
  );

  /** Moves to `step` if the user has unlocked it. Returns whether it moved. */
  const goTo = useCallback(
    (step: WizardStep): boolean => {
      if (!canGoTo(step)) return false;
      dispatch({ type: "goTo", step });
      return true;
    },
    [canGoTo],
  );

  /** True when the user has done anything in steps 2 to 5 that a new upload would wipe. */
  const hasLaterStepWork = useMemo(() => {
    if (!state.upload) return false;
    if (stepIndex(state.furthest) > stepIndex("mapping")) return true;
    // A preview alone is not user work (it loads by itself), so it does not count.
    if (state.check !== null || state.progress !== null) return true;
    const start = buildStartingMapping(state.upload);
    const mappingChanged = Object.keys(start).some((header) => state.mapping[header] !== start[header]);
    const optionsChanged = JSON.stringify(state.options) !== JSON.stringify(createDefaultImportOptions());
    return mappingChanged || optionsChanged;
  }, [state.upload, state.furthest, state.check, state.progress, state.mapping, state.options]);

  return {
    state,
    hasLaterStepWork,
    canGoTo,
    setUpload,
    setMapping,
    patchOptions,
    setPreview,
    setCheck,
    markStale,
    setProgress,
    unlock,
    goTo,
    reset,
  };
}

export type LeadImportWizard = ReturnType<typeof useLeadImportWizard>;
