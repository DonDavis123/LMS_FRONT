import { useEffect, useRef, useState } from "react";
import type { ProgressResult } from "@/features/leadImport/types/leadImport.types";
import {
  elapsedSeconds,
  estimateSecondsLeft,
  type ProgressSample,
} from "@/features/leadImport/utils/runProgress";

export interface RunClock {
  elapsed: number;
  secondsLeft: number | null;
}

/** Elapsed time and a time-left estimate, refreshed once a second with a timeout chain (no setInterval). */
export function useRunClock(progress: ProgressResult | null, active: boolean): RunClock {
  const [clock, setClock] = useState<RunClock>({ elapsed: 0, secondsLeft: null });
  const latest = useRef(progress);
  const sample = useRef<ProgressSample | null>(null);
  const sessionStart = useRef(0);

  useEffect(() => {
    latest.current = progress;
    if (sessionStart.current === 0) sessionStart.current = Date.now();
    if (progress && !sample.current) sample.current = { rows: progress.processed_rows, at: Date.now() };
  });

  useEffect(() => {
    if (!active) return;
    let timer = 0;
    function tick() {
      const now = Date.now();
      const current = latest.current;
      const elapsed = elapsedSeconds(current, sessionStart.current || now, now);
      setClock({ elapsed, secondsLeft: estimateSecondsLeft(current, sample.current, elapsed, now) });
      timer = window.setTimeout(tick, 1000);
    }
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [active]);

  return clock;
}
