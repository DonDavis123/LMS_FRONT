import { useCallback, useEffect, useRef, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import type {
  ImportMapping,
  ImportOptions,
  MappingPreviewResponse,
} from "@/features/leadImport/types/leadImport.types";

/** How long the mapping must stay unchanged before it is sent. */
export const PREVIEW_DEBOUNCE_MS = 600;

interface Params {
  jobId: string;
  /** JSON of {mapping, options}. It is the one thing the request depends on. */
  signature: string;
  /** False when there is nothing worth asking the server about (no column mapped). */
  enabled: boolean;
  /** The signature the wizard's stored preview was made for. */
  previewKey: string | null;
  onResult: (preview: MappingPreviewResponse, key: string) => void;
}

interface FailedFor {
  signature: string;
  error: ImportErrorInfo;
}

/**
 * Keeps the mapping preview up to date.
 *
 * - Any change of `signature` waits PREVIEW_DEBOUNCE_MS, then sends ONE request.
 * - A new change (or leaving the screen) aborts the request in flight and bumps
 *   a request counter, so a slow old answer can never replace a newer one.
 * - Opening the screen with a preview that already matches does nothing; with
 *   one that does not match (options changed in step 3) it asks straight away.
 */
export function useMappingPreview({ jobId, signature, enabled, previewKey, onResult }: Params) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<FailedFor | null>(null);
  const [nonce, setNonce] = useState(0);

  const counter = useRef(0);
  // True for the first request on this screen and after "Try again": no pause.
  const skipPause = useRef(true);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  const needsRequest = enabled && previewKey !== signature;

  useEffect(() => {
    if (!enabled || previewKey === signature) return;

    const controller = new AbortController();
    const requestId = ++counter.current;
    const body = JSON.parse(signature) as { mapping: ImportMapping; options: ImportOptions };

    const timer = window.setTimeout(
      async () => {
        skipPause.current = false;
        setLoading(true);
        try {
          const preview = await LeadImportService.previewMapping(jobId, body.mapping, body.options, controller.signal);
          if (requestId !== counter.current) return;
          setLoading(false);
          setFailed(null);
          onResultRef.current(preview, signature);
        } catch (error) {
          if (requestId !== counter.current) return;
          const info = getImportError(error, "We could not check your mapping.");
          if (info.isCancelled) return;
          setLoading(false);
          setFailed({ signature, error: info });
        }
      },
      skipPause.current ? 0 : PREVIEW_DEBOUNCE_MS,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      counter.current += 1;
      setLoading(false);
    };
  }, [jobId, signature, enabled, previewKey, nonce]);

  const retry = useCallback(() => {
    skipPause.current = true;
    setFailed(null);
    setNonce((value) => value + 1);
  }, []);

  const error = failed && failed.signature === signature ? failed.error : null;
  return {
    /** A request is waiting for the pause to end, or is running. */
    pending: needsRequest && error === null,
    /** A request is running right now. */
    loading,
    error,
    retry,
  };
}
