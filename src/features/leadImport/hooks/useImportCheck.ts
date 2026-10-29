import { useCallback, useEffect, useRef, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type {
  ImportMapping,
  ImportOptions,
  ValidateResponse,
} from "@/features/leadImport/types/leadImport.types";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

/** How long changes must stop before the check runs again by itself. */
export const RECHECK_DELAY_MS = 1500;

/** idle: no request running (the check may be missing or out of date). */
export type CheckPhase = "idle" | "checking" | "done" | "failed";

interface Params {
  jobId: string;
  mapping: ImportMapping;
  options: ImportOptions;
  check: ValidateResponse | null;
  checkIsStale: boolean;
  setCheck: (check: ValidateResponse | null) => void;
  markStale: () => void;
}

/** Settings to use instead of the ones in the wizard state, for a call made in the same tick as a change. */
export interface CheckOverride {
  mapping?: ImportMapping;
  options?: ImportOptions;
}

/**
 * Runs the full check (validate) for the review step.
 *
 * - Opening the step with no check, or an out-of-date one, runs it at once.
 * - notifyChanged() is for anything that makes the check out of date (a row
 *   left out, an owner or value choice). It marks the check stale, cancels any
 *   request still in flight (its answer would describe the old settings) and
 *   runs the check again after RECHECK_DELAY_MS of quiet.
 * - run() checks now. A request counter means only the newest answer is
 *   stored, and the request in flight is aborted when a newer one starts or
 *   the step closes.
 */
export function useImportCheck({ jobId, mapping, options, check, checkIsStale, setCheck, markStale }: Params) {
  const [phase, setPhase] = useState<CheckPhase>(() => (check && !checkIsStale ? "done" : "idle"));
  const [error, setError] = useState<ImportErrorInfo | null>(null);

  const counter = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<number | null>(null);
  const alive = useRef(false);
  const needsCheckOnOpen = useRef(!check || checkIsStale);

  // The newest props, readable from callbacks that must not change identity.
  const latest = useRef({ jobId, mapping, options, setCheck, markStale });
  useEffect(() => {
    latest.current = { jobId, mapping, options, setCheck, markStale };
  });

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const run = useCallback(
    async (override?: CheckOverride): Promise<void> => {
      clearTimer();
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      const id = ++counter.current;
      const current = latest.current;

      setPhase("checking");
      setError(null);
      try {
        const result = await LeadImportService.validate(
          current.jobId,
          override?.mapping ?? current.mapping,
          override?.options ?? current.options,
          request.signal,
        );
        if (id !== counter.current) return; // a newer request owns the screen now
        latest.current.setCheck(result);
        setPhase("done");
      } catch (failure) {
        if (id !== counter.current) return;
        const info = getImportError(failure, "We could not check your file.");
        if (info.isCancelled) return;
        setError(info);
        setPhase("failed");
      }
    },
    [clearTimer],
  );

  const notifyChanged = useCallback(
    (delayMs: number = RECHECK_DELAY_MS) => {
      counter.current += 1; // an answer still on its way describes the old settings
      controller.current?.abort();
      controller.current = null;
      clearTimer();
      latest.current.markStale();
      if (!alive.current) return; // the step was closed meanwhile; it checks again when it reopens
      setPhase("idle");
      setError(null);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void run();
      }, delayMs);
    },
    [clearTimer, run],
  );

  useEffect(() => {
    alive.current = true;
    if (needsCheckOnOpen.current) void run();
    return () => {
      alive.current = false;
      counter.current += 1;
      controller.current?.abort();
      controller.current = null;
      clearTimer();
    };
  }, [run, clearTimer]);

  return { phase, error, run, notifyChanged };
}
