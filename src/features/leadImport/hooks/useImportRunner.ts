import { useCallback, useEffect, useRef, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type { ImportMapping, ImportOptions, ProgressResult } from "@/features/leadImport/types/leadImport.types";
import { getImportError, type ImportErrorExtra, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

/**
 * idle                 start mode, waiting for the click on "Start import"
 * starting             the first request (start, or the first progress call when resuming)
 * running              the loop is calling process
 * cancelling           a cancel was sent; waiting for the current batch to end
 * finished             next_action was "done" (includes a cancelled import)
 * failed               the server reported a failure (or an unexpected answer)
 * interrupted          the connection was lost for good; the import is safe on the server
 * blocked              409 import_already_running
 * failed-before-start  400 import_settings_invalid
 * not-found            404 import_not_found
 */
export type RunnerPhase =
  | "idle"
  | "starting"
  | "running"
  | "cancelling"
  | "finished"
  | "failed"
  | "interrupted"
  | "blocked"
  | "failed-before-start"
  | "not-found";

export type RunnerMode =
  | { kind: "start"; mapping: ImportMapping; options: ImportOptions }
  | { kind: "resume" };

export interface RunnerError {
  message: string;
  howToFix: string | null;
  code: string | null;
  extra: ImportErrorExtra;
}

export interface ImportRunnerState {
  phase: RunnerPhase;
  progress: ProgressResult | null;
  error: RunnerError | null;
  /** 0 when the connection is fine; otherwise which retry is under way. */
  reconnectAttempt: number;
  /** Resume found the import already finished (or failed): nothing ran in this session. */
  alreadyFinished: boolean;
  checkingStatus: boolean;
  /** The answer of the last "Check status" while the import is still running. */
  statusNote: string | null;
  /** Why the last cancel did not work. */
  cancelError: RunnerError | null;
}

export const MAX_RETRIES = 6;
export const RETRY_BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
export const DELAY_AFTER_BATCH_MS = 300;
export const DELAY_WHEN_STUCK_MS = 1500;

interface UseImportRunnerArgs {
  jobId: string;
  mode: RunnerMode;
  /** The import is a real job on the server now (the draft must not be discarded). */
  onStarted?: () => void;
  /** The start was refused (settings invalid, blocked, not found): the draft is still a draft. */
  onStartFailed?: () => void;
}

function toRunnerError(info: ImportErrorInfo): RunnerError {
  return { message: info.message, howToFix: info.howToFix, code: info.code, extra: info.extra };
}

/** A lost connection, a timeout, a sleeping server (5xx) or a busy one (429) is worth retrying. */
function isRetryable(info: ImportErrorInfo): boolean {
  return info.isNetwork || (info.status !== null && (info.status >= 500 || info.status === 429));
}

type Attempt<T> =
  | { kind: "ok"; value: T }
  | { kind: "stale" }
  | { kind: "exhausted" }
  | { kind: "error"; info: ImportErrorInfo };

/**
 * Drives an import: keeps calling process until the server says it is done.
 * No UI. Never uses setInterval, never cancels the import on unmount, and
 * only ever runs one loop at a time.
 */
export function useImportRunner({ jobId, mode, onStarted, onStartFailed }: UseImportRunnerArgs) {
  const [state, setState] = useState<ImportRunnerState>({
    phase: mode.kind === "resume" ? "starting" : "idle",
    progress: null,
    error: null,
    reconnectAttempt: 0,
    alreadyFinished: false,
    checkingStatus: false,
    statusNote: null,
    cancelError: null,
  });

  // Latest inputs, read inside async code without making it depend on renders.
  const latest = useRef({ jobId, mode, onStarted, onStartFailed });
  useEffect(() => {
    latest.current = { jobId, mode, onStarted, onStartFailed };
  });

  /** Bumped by stop(): every async step checks it and quietly gives up when it changed. */
  const generation = useRef(0);
  /** True while one loop (start, resume or process) is alive. The guard against two loops. */
  const loopActive = useRef(false);
  const sleepTimer = useRef<number | null>(null);
  const wakeSleep = useRef<(() => void) | null>(null);
  /** Last processed_rows the server told us. Sent back so a repeated request is harmless. */
  const lastProcessed = useRef<number | undefined>(undefined);
  /** The server has answered at least once, so the job exists and is started. */
  const confirmed = useRef(false);
  const statusBusy = useRef(false);

  const patch = useCallback((next: Partial<ImportRunnerState>) => setState((prev) => ({ ...prev, ...next })), []);

  const sleep = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        wakeSleep.current = resolve;
        sleepTimer.current = window.setTimeout(() => {
          sleepTimer.current = null;
          wakeSleep.current = null;
          resolve();
        }, ms);
      }),
    [],
  );

  /** Ends whatever is running on this screen. The import itself keeps going on the server. */
  const stop = useCallback(() => {
    generation.current += 1;
    loopActive.current = false;
    if (sleepTimer.current !== null) window.clearTimeout(sleepTimer.current);
    sleepTimer.current = null;
    const wake = wakeSleep.current;
    wakeSleep.current = null;
    wake?.();
  }, []);

  // Leaving the screen stops the loop but never cancels the import.
  useEffect(() => stop, [stop]);

  /** Calls `fn`, retrying a lost connection with backoff. Reports `exhausted` after MAX_RETRIES retries. */
  const attempt = useCallback(
    async <T>(fn: () => Promise<T>, gen: number): Promise<Attempt<T>> => {
      let failures = 0;
      for (;;) {
        try {
          const value = await fn();
          if (gen !== generation.current) return { kind: "stale" };
          if (failures > 0) patch({ reconnectAttempt: 0 });
          return { kind: "ok", value };
        } catch (caught) {
          if (gen !== generation.current) return { kind: "stale" };
          const info = getImportError(caught);
          if (!isRetryable(info)) {
            if (failures > 0) patch({ reconnectAttempt: 0 });
            return { kind: "error", info };
          }
          failures += 1;
          if (failures > MAX_RETRIES) {
            patch({ reconnectAttempt: 0 });
            return { kind: "exhausted" };
          }
          patch({ reconnectAttempt: failures });
          await sleep(RETRY_BACKOFF_MS[Math.min(failures - 1, RETRY_BACKOFF_MS.length - 1)]);
          if (gen !== generation.current) return { kind: "stale" };
        }
      }
    },
    [patch, sleep],
  );

  /** Puts a refused/unexpected answer on screen. Returns nothing; the caller stops. */
  const showError = useCallback(
    (info: ImportErrorInfo, beforeStart: boolean) => {
      const error = toRunnerError(info);
      const code = info.code;
      if (code === "import_not_found" || info.status === 404) {
        patch({ phase: "not-found", error });
        if (beforeStart) latest.current.onStartFailed?.();
      } else if (code === "import_already_running" || info.status === 409) {
        patch({ phase: "blocked", error });
        if (beforeStart) latest.current.onStartFailed?.();
      } else if (code === "import_settings_invalid" && beforeStart) {
        patch({ phase: "failed-before-start", error });
        latest.current.onStartFailed?.();
      } else {
        patch({ phase: "failed", error });
        if (beforeStart) latest.current.onStartFailed?.();
      }
    },
    [patch],
  );

  /** Shows a progress answer. Returns true when the loop must go on. */
  const applyProgress = useCallback(
    (progress: ProgressResult, opts: { first?: boolean } = {}): boolean => {
      lastProcessed.current = progress.processed_rows;
      if (progress.next_action === "call_process_again") {
        patch({ phase: "running", progress, error: null, statusNote: null });
        return true;
      }
      const done = progress.next_action === "done";
      patch({
        phase: done ? "finished" : "failed",
        progress,
        error: null,
        statusNote: null,
        alreadyFinished: Boolean(opts.first),
      });
      return false;
    },
    [patch],
  );

  /** The process loop. Stops on done / failed, an error, or a new generation. */
  const runLoop = useCallback(
    async (gen: number) => {
      let delay = DELAY_AFTER_BATCH_MS;
      for (;;) {
        await sleep(delay);
        if (gen !== generation.current) return;
        const { jobId: id } = latest.current;
        const sent = lastProcessed.current;
        const result = await attempt(() => LeadImportService.process(id, sent), gen);
        if (result.kind === "stale") return;
        if (result.kind === "exhausted") {
          patch({ phase: "interrupted" });
          return;
        }
        if (result.kind === "error") {
          showError(result.info, false);
          return;
        }
        const progress = result.value;
        const moved = progress.processed_rows !== sent;
        if (!applyProgress(progress)) return;
        // Nothing moved: another tab or the server's own schedule holds the batch.
        delay = moved ? DELAY_AFTER_BATCH_MS : DELAY_WHEN_STUCK_MS;
      }
    },
    [applyProgress, attempt, patch, showError, sleep],
  );

  /** Reads the progress once and carries on only when the server still wants process calls. */
  const resumeFlow = useCallback(
    async (gen: number, first: boolean) => {
      const { jobId: id } = latest.current;
      const result = await attempt(() => LeadImportService.getProgress(id), gen);
      if (result.kind === "stale") return;
      if (result.kind === "exhausted") {
        patch({ phase: "interrupted" });
        return;
      }
      if (result.kind === "error") {
        showError(result.info, false);
        return;
      }
      if (!confirmed.current) {
        confirmed.current = true;
        latest.current.onStarted?.();
      }
      if (!applyProgress(result.value, { first })) return;
      await runLoop(gen);
    },
    [applyProgress, attempt, patch, runLoop, showError],
  );

  const startFlow = useCallback(
    async (gen: number) => {
      const { jobId: id, mode: current } = latest.current;
      if (current.kind !== "start") return;
      const { mapping, options } = current;
      const result = await attempt(() => LeadImportService.start(id, mapping, options), gen);
      if (result.kind === "stale") return;
      if (result.kind === "exhausted") {
        // We do not know whether the server got it. The screen offers "Try again" and "Check status".
        patch({ phase: "interrupted" });
        return;
      }
      if (result.kind === "error") {
        if (result.info.code === "import_already_started") {
          // A repeated start (or a start that did arrive): just follow the job.
          await resumeFlow(gen, false);
          return;
        }
        showError(result.info, !confirmed.current);
        return;
      }
      confirmed.current = true;
      if (!applyProgress(result.value, { first: false })) return;
      await runLoop(gen);
    },
    [applyProgress, attempt, patch, resumeFlow, runLoop, showError],
  );

  /** Starts one flow unless a loop is already alive. Always the single entry point. */
  const begin = useCallback(
    (flow: "start" | "resume", opts: { first?: boolean } = {}) => {
      if (loopActive.current) return;
      loopActive.current = true;
      const gen = generation.current;
      patch({ phase: "starting", error: null, cancelError: null, statusNote: null, reconnectAttempt: 0 });
      void (async () => {
        try {
          if (flow === "start") await startFlow(gen);
          else await resumeFlow(gen, Boolean(opts.first));
        } finally {
          if (gen === generation.current) loopActive.current = false;
        }
      })();
    },
    [patch, resumeFlow, startFlow],
  );

  /** Start mode: the click on "Start import". */
  const start = useCallback(() => {
    if (latest.current.mode.kind !== "start") return;
    // The draft is a real job from this click on, so leaving no longer discards it.
    latest.current.onStarted?.();
    begin("start");
  }, [begin]);

  /** "Try again" after an interruption. */
  const retry = useCallback(() => {
    if (confirmed.current || latest.current.mode.kind === "resume") begin("resume");
    else begin("start");
  }, [begin]);

  /** One progress call, no loop. */
  const checkStatus = useCallback(async () => {
    if (statusBusy.current || loopActive.current) return;
    statusBusy.current = true;
    const gen = generation.current;
    patch({ checkingStatus: true, statusNote: null });
    try {
      const { jobId: id } = latest.current;
      const result = await attempt(() => LeadImportService.getProgress(id), gen);
      if (result.kind === "stale") return;
      if (result.kind === "exhausted") {
        patch({ statusNote: "Still cannot reach the server. Your import is safe. Try again in a moment." });
        return;
      }
      if (result.kind === "error") {
        showError(result.info, false);
        return;
      }
      if (!confirmed.current) {
        confirmed.current = true;
        latest.current.onStarted?.();
      }
      const progress = result.value;
      if (progress.next_action === "call_process_again") {
        patch({ progress, statusNote: "The import is still running on the server." });
      } else {
        applyProgress(progress);
      }
    } finally {
      statusBusy.current = false;
      if (gen === generation.current) patch({ checkingStatus: false });
    }
  }, [applyProgress, attempt, patch, showError]);

  /** Cancels on the server and stops the loop. The screen asks for confirmation first. */
  const cancel = useCallback(() => {
    if (state.phase !== "running") return;
    stop();
    loopActive.current = true;
    const gen = generation.current;
    patch({ phase: "cancelling", cancelError: null });
    void (async () => {
      let handedOff = false;
      try {
        const { jobId: id } = latest.current;
        const result = await attempt(() => LeadImportService.cancel(id), gen);
        if (result.kind === "stale") return;
        if (result.kind === "exhausted") {
          patch({ phase: "interrupted" });
          return;
        }
        if (result.kind === "error") {
          // The cancel did not work: say so and keep following the import.
          handedOff = true;
          loopActive.current = false;
          begin("resume");
          patch({ cancelError: toRunnerError(result.info) });
          return;
        }
        let progress = result.value;
        // The server stops after the current batch. Wait for its final answer.
        while (progress.next_action === "call_process_again") {
          await sleep(DELAY_WHEN_STUCK_MS);
          if (gen !== generation.current) return;
          const { jobId: again } = latest.current;
          const next = await attempt(() => LeadImportService.getProgress(again), gen);
          if (next.kind === "stale") return;
          if (next.kind === "exhausted") {
            patch({ phase: "interrupted" });
            return;
          }
          if (next.kind === "error") {
            showError(next.info, false);
            return;
          }
          progress = next.value;
        }
        applyProgress(progress);
      } finally {
        if (!handedOff && gen === generation.current) loopActive.current = false;
      }
    })();
  }, [applyProgress, attempt, begin, patch, showError, sleep, state.phase, stop]);

  // Resume mode follows the import by itself. The timeout makes React strict mode's
  // mount-unmount-mount start exactly one flow.
  useEffect(() => {
    if (latest.current.mode.kind !== "resume") return;
    const timer = window.setTimeout(() => begin("resume", { first: true }), 0);
    return () => window.clearTimeout(timer);
  }, [begin]);

  return { ...state, start, retry, checkStatus, cancel };
}
