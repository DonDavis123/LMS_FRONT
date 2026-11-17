"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LeadSummaryService } from "@/features/leads/services/LeadSummaryService";
import type { LeadSummary } from "@/features/leads/types/leadSummary.types";
import { extractApiError } from "@/shared/utils/apiError";

/**
 * On-demand summary of one lead. Nothing is requested until `generate()` is
 * called (a button click); the result only lives in this component's state.
 */
export function useLeadSummary(leadId: string) {
  const [summary, setSummary] = useState<LeadSummary | null>(null);
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
      const result = await LeadSummaryService.generate(leadId);
      if (requestId.current !== current) return;
      setSummary(result);
    } catch (err) {
      if (requestId.current !== current) return;
      setError(extractApiError(err, "Couldn't generate the summary. Try again."));
    } finally {
      if (requestId.current === current) setLoading(false);
    }
  }, [leadId]);

  return { summary, loading, error, generate };
}
