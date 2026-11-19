"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccountSummaryService } from "@/features/accounts/services/AccountSummaryService";
import type { AccountSummary } from "@/features/accounts/types/accountSummary.types";
import { extractApiError } from "@/shared/utils/apiError";

/**
 * Summary of one account.
 *
 * On mount it loads the summary the backend stored last time (free: no model
 * request). `generate()` — a button click — writes a new one; the backend
 * deletes the old summary permanently, so the new one simply replaces it here.
 */
export function useAccountSummary(accountId: string) {
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  /** True while the stored summary is being fetched on mount. */
  const [loadingStored, setLoadingStored] = useState(true);
  /** True while a new summary is being written. */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ignores an answer that arrives after unmount or after a newer request.
  const requestId = useRef(0);

  useEffect(() => {
    const current = ++requestId.current;
    setLoadingStored(true);
    AccountSummaryService.getLatest(accountId)
      .then((stored) => {
        if (requestId.current === current) setSummary(stored);
      })
      // A failed read is not worth an error banner: the card just offers "Generate".
      .catch(() => undefined)
      .finally(() => {
        if (requestId.current === current) setLoadingStored(false);
      });

    return () => {
      requestId.current += 1;
    };
  }, [accountId]);

  const generate = useCallback(async () => {
    const current = ++requestId.current;
    setLoadingStored(false);
    setLoading(true);
    setError(null);
    try {
      const result = await AccountSummaryService.generate(accountId);
      if (requestId.current !== current) return;
      setSummary(result);
    } catch (err) {
      if (requestId.current !== current) return;
      // The previous summary stays on screen (and in the backend) when this fails.
      setError(extractApiError(err, "Couldn't generate the summary. Try again."));
    } finally {
      if (requestId.current === current) setLoading(false);
    }
  }, [accountId]);

  return { summary, loading, loadingStored, error, generate };
}
