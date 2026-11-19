"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ContactSummaryService } from "@/features/contacts/services/ContactSummaryService";
import type { ContactSummary } from "@/features/contacts/types/contactSummary.types";
import { extractApiError } from "@/shared/utils/apiError";

/**
 * Summary of one contact.
 *
 * On mount it loads the summary the backend stored last time (free: no model
 * request). `generate()` — a button click — writes a new one; the backend
 * deletes the old summary permanently, so the new one simply replaces it here.
 */
export function useContactSummary(contactId: string) {
  const [summary, setSummary] = useState<ContactSummary | null>(null);
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
    ContactSummaryService.getLatest(contactId)
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
  }, [contactId]);

  const generate = useCallback(async () => {
    const current = ++requestId.current;
    setLoadingStored(false);
    setLoading(true);
    setError(null);
    try {
      const result = await ContactSummaryService.generate(contactId);
      if (requestId.current !== current) return;
      setSummary(result);
    } catch (err) {
      if (requestId.current !== current) return;
      // The previous summary stays on screen (and in the backend) when this fails.
      setError(extractApiError(err, "Couldn't generate the summary. Try again."));
    } finally {
      if (requestId.current === current) setLoading(false);
    }
  }, [contactId]);

  return { summary, loading, loadingStored, error, generate };
}
