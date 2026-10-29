import { useCallback, useMemo, useReducer } from "react";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
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
  /** The mapping + options the `preview` was made for (a JSON string). Lets step 2 skip a request it already has the answer to. */
  previewKey: string | null;
  /** Eligible lead owners, loaded once by step 3 and kept for the whole wizard. */
  owners: LeadOwnerOption[] | null;
  check: ValidateResponse | null;
  /** True after any mapping, option or exclusion change since `check` was made. */
  checkIsStale: boolean;
  progress: ProgressResult | null;
  /** True from the click on "Start import". The draft is a real import then: steps 1 to 4 are locked and nothing is discarded. */
  started: boolean;
}

type Action =
  | { type: "setUpload"; upload: UploadResponse; file: File | null }
  | { type: "setMapping"; mapping: ImportMapping }
  | { type: "patchOptions"; patch: Partial<ImportOptions> }
  | { type: "setPreview"; preview: MappingPreviewResponse | null; key: string | null }
  | { type: "setOwners"; owners: LeadOwnerOption[] | null }
  | { type: "advance"; step: WizardStep }
  | { type: "setCheck"; check: ValidateResponse | null }
  | { type: "markStale" }
  | { type: "setProgress"; progress: ProgressResult | null }
  | { type: "setStarted"; started: boolean }
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
    previewKey: null,
    owners: null,
    check: null,
    checkIsStale: false,
    progress: null,
    started: false,
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
      return { ...state, preview: action.preview, previewKey: action.preview ? action.key : null };
    case "setOwners":
      return { ...state, owners: action.owners };
    case "advance": {
      // Unlock and move in one step, so a screen can continue right after it decides it is complete.
      const furthest = stepIndex(action.step) > stepIndex(state.furthest) ? action.step : state.furthest;
      return { ...state, furthest, step: action.step };
    }
    case "setCheck":
      return { ...state, check: action.check, checkIsStale: false };
    case "markStale":
      return { ...state, checkIsStale: true };
    case "setProgress":
      return { ...state, progress: action.progress };
    case "setStarted":
      return state.started === action.started ? state : { ...state, started: action.started };
    case "unlock":
      return stepIndex(action.step) > stepIndex(state.furthest) ? { ...state, furthest: action.step } : state;
    case "goTo":
      if (state.started) return state;
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
  const setPreview = useCallback(
    (preview: MappingPreviewResponse | null, key: string | null = null) => dispatch({ type: "setPreview", preview, key }),
    [],
  );
  const setOwners = useCallback((owners: LeadOwnerOption[] | null) => dispatch({ type: "setOwners", owners }), []);
  const setCheck = useCallback((check: ValidateResponse | null) => dispatch({ type: "setCheck", check }), []);
  const markStale = useCallback(() => dispatch({ type: "markStale" }), []);
  const setProgress = useCallback((progress: ProgressResult | null) => dispatch({ type: "setProgress", progress }), []);
  /** Step 5 calls this: true on the click on "Start import", false when the server refuses the start. */
  const setStarted = useCallback((started: boolean) => dispatch({ type: "setStarted", started }), []);
  /** Lets the user reach `step` (and any step before it). Later parts call this when a step is complete. */
  const unlock = useCallback((step: WizardStep) => dispatch({ type: "unlock", step }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  const canGoTo = useCallback(
    // Once the import has started only the import step is reachable.
    (step: WizardStep) => (state.started ? step === "import" : stepIndex(step) <= stepIndex(state.furthest)),
    [state.furthest, state.started],
  );

  /** Unlocks `step` and moves to it. Only call this once the current screen is valid. */
  const advanceTo = useCallback((step: WizardStep) => dispatch({ type: "advance", step }), []);

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
    if (state.check !== null || state.progress !== null || state.started) return true;
    const start = buildStartingMapping(state.upload);
    const mappingChanged = Object.keys(start).some((header) => state.mapping[header] !== start[header]);
    const optionsChanged = JSON.stringify(state.options) !== JSON.stringify(createDefaultImportOptions());
    return mappingChanged || optionsChanged;
  }, [state.upload, state.furthest, state.check, state.progress, state.started, state.mapping, state.options]);

  return {
    state,
    hasLaterStepWork,
    canGoTo,
    setUpload,
    setMapping,
    patchOptions,
    setPreview,
    setOwners,
    setCheck,
    markStale,
    setProgress,
    setStarted,
    unlock,
    goTo,
    advanceTo,
    reset,
  };
}

export type LeadImportWizard = ReturnType<typeof useLeadImportWizard>;
