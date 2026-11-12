"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CallRecordingService } from "@/features/calls/services/CallRecordingService";
import { extractApiError } from "@/shared/utils/apiError";
import { unwrapBlobError } from "@/shared/utils/download";

export type RecordingAudioStatus = "idle" | "loading" | "ready" | "error";

/**
 * Loads one recording's audio on demand. The endpoint needs the bearer token,
 * so the file is fetched with the API client as a Blob and exposed as an object
 * URL (revoked when the component goes away). Nothing is downloaded until
 * `load()` is called, so a long list of recordings costs no bandwidth.
 */
export function useRecordingAudio(callId: string, recordingId: string) {
  const [status, setStatus] = useState<RecordingAudioStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const inFlight = useRef<Promise<string | null> | null>(null);

  const load = useCallback((): Promise<string | null> => {
    if (urlRef.current) return Promise.resolve(urlRef.current);
    if (inFlight.current) return inFlight.current;

    setStatus("loading");
    setError(null);
    inFlight.current = CallRecordingService.getRecordingBlob(callId, recordingId)
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
        setStatus("ready");
        return objectUrl;
      })
      .catch(async (err) => {
        const unwrapped = await unwrapBlobError(err);
        setError(extractApiError(unwrapped, "Couldn't load this recording."));
        setStatus("error");
        return null;
      })
      .finally(() => {
        inFlight.current = null;
      });
    return inFlight.current;
  }, [callId, recordingId]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    },
    [],
  );

  return { status, url, error, load };
}
