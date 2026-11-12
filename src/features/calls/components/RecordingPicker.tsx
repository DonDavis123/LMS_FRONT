"use client";

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { AlertCircle, FileAudio, Mic, Square, UploadCloud, X } from "lucide-react";
import { useVoiceRecorder } from "@/features/calls/hooks/useVoiceRecorder";
import {
  MAX_RECORDING_DURATION_SECONDS,
  MAX_RECORDING_MB,
  type PendingRecording,
} from "@/features/calls/types/callRecording.types";
import {
  browserRecordingName,
  formatFileSize,
  formatPlayerTime,
  readAudioDuration,
  RECORDING_ACCEPT,
  RECORDING_FORMATS_LABEL,
  validateRecordingFile,
} from "@/features/calls/utils/recordingFormat";

interface RecordingPickerProps {
  value: PendingRecording | null;
  onChange: (value: PendingRecording | null) => void;
  /** Locks the picker while an upload / save is running. */
  disabled?: boolean;
}

/**
 * Choose an audio file (click or drag & drop) or record the microphone, and
 * hand the result to the parent. It never uploads anything itself: the Log Call
 * form and the "Add recording" dialog each upload `value` their own way.
 */
export default function RecordingPicker({ value, onChange, disabled = false }: RecordingPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const recorder = useVoiceRecorder(MAX_RECORDING_DURATION_SECONDS);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // A finished microphone recording becomes the picked file.
  useEffect(() => {
    if (!recorder.result) return;
    const { blob, mimeType, durationSeconds } = recorder.result;
    const name = browserRecordingName(mimeType);
    const problem = validateRecordingFile(blob, name);
    if (problem) {
      setError(problem);
      onChangeRef.current(null);
      return;
    }
    setError(null);
    onChangeRef.current({ file: blob, name, durationSeconds });
  }, [recorder.result]);

  async function pick(file: File | undefined) {
    if (!file || disabled) return;
    const problem = validateRecordingFile(file, file.name);
    if (problem) {
      setError(problem);
      onChange(null);
      return;
    }
    setError(null);
    onChange({ file, name: file.name, durationSeconds: null });
    const seconds = await readAudioDuration(file);
    if (seconds !== null) onChangeRef.current({ file, name: file.name, durationSeconds: seconds });
  }

  function clear() {
    onChange(null);
    setError(null);
    recorder.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    void pick(event.dataTransfer.files?.[0]);
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  const recording = recorder.state === "recording";
  const requesting = recorder.state === "requesting";
  const message = error ?? recorder.error;

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-paper/50 px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-light text-slate">
            <FileAudio size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg" title={value.name}>
              {value.name}
            </p>
            <p className="text-xs text-ink-soft">
              {formatFileSize(value.file.size)}
              {value.durationSeconds ? ` · ${formatPlayerTime(value.durationSeconds)}` : ""}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={clear}
              aria-label="Remove recording"
              className="rounded-md p-1.5 text-ink-soft hover:bg-paper hover:text-fg"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : recording || requesting ? (
        <div className="flex items-center gap-3 rounded-lg border border-danger/30 bg-danger-soft/40 px-3 py-2.5">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden="true" />
          <span className="text-sm font-medium tabular-nums text-fg">{formatPlayerTime(recorder.elapsed)}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
            {requesting ? "Waiting for microphone access…" : "Recording… speak near the microphone"}
          </span>
          <button
            type="button"
            onClick={recorder.stop}
            disabled={requesting}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            <Square size={11} fill="currentColor" />
            Stop
          </button>
        </div>
      ) : (
        <div
          role="group"
          tabIndex={disabled ? -1 : 0}
          aria-label="Add a call recording"
          onKeyDown={handleKey}
          onDragEnter={(event) => {
            event.preventDefault();
            depth.current += 1;
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            depth.current = Math.max(0, depth.current - 1);
            if (depth.current === 0) setDragging(false);
          }}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed px-4 py-4 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate ${
            dragging ? "border-slate bg-slate-light" : "border-line bg-paper/50"
          }`}
        >
          <p className="flex items-center justify-center gap-2 text-sm text-fg">
            <UploadCloud size={16} className="text-slate" />
            {dragging ? "Drop the recording here" : "Drag & drop a recording here"}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper disabled:opacity-50"
            >
              <FileAudio size={14} />
              Choose file
            </button>
            {recorder.supported && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => void recorder.start()}
                className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper disabled:opacity-50"
              >
                <Mic size={14} />
                Record now
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            {RECORDING_FORMATS_LABEL} · up to {MAX_RECORDING_MB} MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={RECORDING_ACCEPT}
        className="hidden"
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {message && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-danger" role="alert">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
