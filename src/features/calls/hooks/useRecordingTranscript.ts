"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CallTranscriptService } from "@/features/calls/services/CallTranscriptService";
import { isTranscriptActive, type RecordingTranscript } from "@/features/calls/types/callTranscript.types";
import { transcriptPollDelay } from "@/features/calls/utils/transcriptFormat";
import { extractApiError } from "@/shared/utils/apiError";

/**
 * Transcript + summary of one recording. Loads the current state once, then
 * polls (3 s, then 6 s) while the backend is still PENDING / PROCESSING and
 * stops by itself on COMPLETED / FAILED / NOT_REQUESTED or when the component
 * goes away. Polling pauses while the browser tab is hidden.
 */
export function useRecordingTranscript(callId: string, recordingId: string) {
  const [transcript, setTranscript] = useState<RecordingTranscript | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** True while a start / retry / regenerate request is in flight. */
  const [requesting, setRequesting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const timer = useRef<number | null>(null);
  const pollStart = useRef(0);
  const alive = useRef(true);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const poll = useCallback(async () => {
    try {
      const next = await CallTranscriptService.getTranscript(callId, recordingId);
      if (!alive.current) return;
      setTranscript(next);
      setError(null);

      if (isTranscriptActive(next.status)) {
        if (!pollStart.current) pollStart.current = Date.now();
        const delay = transcriptPollDelay(Date.now() - pollStart.current);
        timer.current = window.setTimeout(() => {
          // Hidden tab: skip this round, keep the loop alive.
          if (document.hidden) {
            timer.current = window.setTimeout(() => void poll(), delay);
            return;
          }
          void poll();
        }, delay);
      } else {
        pollStart.current = 0;
      }
    } catch (err) {
      if (!alive.current) return;
      setError(extractApiError(err, "Couldn't load the transcript."));
    }
  }, [callId, recordingId]);

  const load = useCallback(() => {
    clearTimer();
    pollStart.current = 0;
    setError(null);
    return poll();
  }, [clearTimer, poll]);

  useEffect(() => {
    alive.current = true;
    setTranscript(null);
    void load();
    return () => {
      alive.current = false;
      clearTimer();
    };
  }, [load, clearTimer]);

  /** Start, retry or regenerate. The backend never duplicates an active run. */
  const request = useCallback(
    async (regenerate = false) => {
      setRequesting(true);
      setActionError(null);
      try {
        const next = await CallTranscriptService.requestTranscript(callId, recordingId, regenerate);
        if (!alive.current) return;
        setTranscript(next);
        clearTimer();
        pollStart.current = 0;
        if (isTranscriptActive(next.status)) {
          timer.current = window.setTimeout(() => void poll(), 3000);
        }
      } catch (err) {
        if (alive.current) setActionError(extractApiError(err, "Couldn't start the transcription. Try again."));
      } finally {
        if (alive.current) setRequesting(false);
      }
    },
    [callId, recordingId, clearTimer, poll],
  );

  return { transcript, error, requesting, actionError, reload: load, request };
}
