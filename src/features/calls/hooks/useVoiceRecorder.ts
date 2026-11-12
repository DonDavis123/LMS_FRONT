"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "requesting" | "recording" | "stopped";

export interface VoiceRecording {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

const PREFERRED_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

/** Records the microphone in the browser (MediaRecorder). */
export function useVoiceRecorder(maxSeconds: number) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceRecording | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const discardRef = useRef(false);

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("This browser can't record audio. Upload a file instead.");
      return;
    }
    setError(null);
    setResult(null);
    setElapsed(0);
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const type = recorder.mimeType || mimeType || "audio/webm";
        cleanup();
        if (discardRef.current) {
          setState("idle");
          return;
        }
        setResult({ blob: new Blob(chunksRef.current, { type }), mimeType: type, durationSeconds: seconds });
        setState("stopped");
      };

      startedAtRef.current = Date.now();
      recorder.start(1000);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(seconds);
        if (seconds >= maxSeconds) stop();
      }, 250);
    } catch (err) {
      cleanup();
      setState("idle");
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      const missing = err instanceof DOMException && err.name === "NotFoundError";
      setError(
        denied
          ? "Microphone access was blocked. Allow it in your browser, or upload a file instead."
          : missing
            ? "No microphone was found on this device."
            : "Couldn't start the recording.",
      );
    }
  }, [cleanup, maxSeconds, stop, supported]);

  const reset = useCallback(() => {
    discardRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else cleanup();
    setResult(null);
    setElapsed(0);
    setError(null);
    setState("idle");
  }, [cleanup]);

  // Release the microphone if the dialog closes mid-recording.
  useEffect(
    () => () => {
      discardRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      cleanup();
    },
    [cleanup],
  );

  return { supported, state, elapsed, error, result, start, stop, reset };
}
