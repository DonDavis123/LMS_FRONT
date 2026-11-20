"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DailyBriefingService } from "@/features/dashboard/services/DailyBriefingService";
import type { DailyBriefing } from "@/features/dashboard/types/dailyBriefing.types";
import { extractApiError } from "@/shared/utils/apiError";

/**
 * The AI plan for today. Nothing loads on mount (it would cost a model request
 * on every dashboard visit): `generate()` — a button click — writes the plan,
 * and calling it again replaces it.
 */
export function useDailyBriefing() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ignores an answer that arrives after unmount or after a newer request.
  const requestId = useRef(0);

  useEffect(() => {
    return () => {
      requestId.current += 1;
    };
  }, []);

  const generate = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await DailyBriefingService.generate();
      if (requestId.current !== current) return;
      setBriefing(result);
    } catch (err) {
      if (requestId.current !== current) return;
      // The previous plan stays on screen when a refresh fails.
      setError(extractApiError(err, "Couldn't plan your day. Try again."));
    } finally {
      if (requestId.current === current) setLoading(false);
    }
  }, []);

  return { briefing, loading, error, generate };
}
