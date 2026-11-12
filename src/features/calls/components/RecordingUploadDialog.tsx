"use client";

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { AlertCircle, FileAudio, Mic, Square, UploadCloud, X } from "lucide-react";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import { CallRecordingService } from "@/features/calls/services/CallRecordingService";
import { useVoiceRecorder } from "@/features/calls/hooks/useVoiceRecorder";
import {
  MAX_RECORDING_DURATION_SECONDS,
  MAX_RECORDING_MB,
  type CallRecording,
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
import { extractApiError } from "@/shared/utils/apiError";

interface RecordingUploadDialogProps {
  isOpen: boolean;
  callId: string;
  /** How many more recordings this call can still take. */
  slotsLeft: number;
  onClose: () => void;
  onUploaded: (recording: CallRecording) => void;
}

interface Picked {
  file: File | Blob;
  name: string;
  durationSeconds: number | null;
}

type Mode = "upload" | "record";

/**
 * Add a recording to a completed call: drop / choose an audio file, or record
 * the microphone right in the browser. Shows upload progress and surfaces the
 * backend's own message when it refuses the file.
 */
export default function RecordingUploadDialog({
  isOpen,
  callId,
  slotsLeft,
  onClose,
  onUploaded,
}: RecordingUploadDialogProps) {
  // The Modal's portal unmounts its children when closed, so every open starts clean.
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg" ariaLabelledBy="recording-upload-title">
      <UploadBody callId={callId} slotsLeft={slotsLeft} onClose={onClose} onUploaded={onUploaded} />
    </Modal>
  );
}

function UploadBody({
  callId,
  slotsLeft,
  onClose,
  onUploaded,
}: Omit<RecordingUploadDialogProps, "isOpen">) {
  const [mode, setMode] = useState<Mode>("upload");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const depth = useRef(0);
  const recorder = useVoiceRecorder(MAX_RECORDING_DURATION_SECONDS);

  // Cancel an upload still in flight if the dialog is closed.
  useEffect(() => () => abortRef.current?.abort(), []);

  // A finished microphone recording becomes the picked file.
  useEffect(() => {
    if (!recorder.result) return;
    const { blob, mimeType, durationSeconds } = recorder.result;
    const name = browserRecordingName(mimeType);
    const problem = validateRecordingFile(blob, name);
    if (problem) {
      setError(problem);
      setPicked(null);
      return;
    }
    setError(null);
    setPicked({ file: blob, name, durationSeconds });
  }, [recorder.result]);

  async function pick(file: File | undefined) {
    if (!file) return;
    const problem = validateRecordingFile(file, file.name);
    if (problem) {
      setError(problem);
      setPicked(null);
      return;
    }
    setError(null);
    setPicked({ file, name: file.name, durationSeconds: null });
    const seconds = await readAudioDuration(file);
    setPicked((current) => (current && current.file === file ? { ...current, durationSeconds: seconds } : current));
  }

  function clearPicked() {
    setPicked(null);
    setError(null);
    setProgress(null);
    recorder.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (uploading) return;
    void pick(event.dataTransfer.files?.[0]);
  }

  function handleZoneKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  async function handleUpload() {
    if (!picked || uploading) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const saved = await CallRecordingService.uploadRecording(callId, picked.file, picked.name, {
        durationSeconds: picked.durationSeconds,
        signal: controller.signal,
        onProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      onUploaded(saved);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(extractApiError(err, "Couldn't upload this recording. Try again."));
      setProgress(null);
      setUploading(false);
    }
  }

  const recording = recorder.state === "recording";
  const requesting = recorder.state === "requesting";
  const disabledNew = slotsLeft <= 0;

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-line px-5 py-4 pr-12">
        <h2 id="recording-upload-title" className="font-serif text-lg text-fg">
          Add call recording
        </h2>
        <p className="mt-0.5 text-xs text-ink-soft">
          Attach the voice recording of this call so you can play it back later.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {!picked && (
          <div role="tablist" className="inline-grid grid-cols-2 rounded-full border border-line bg-paper p-1 text-sm">
            {(
              [
                ["upload", "Upload file", UploadCloud],
                ["record", "Record now", Mic],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                disabled={recording || uploading}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition ${
                  mode === value ? "bg-surface text-fg shadow-sm" : "text-ink-soft hover:text-fg"
                } disabled:opacity-60`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        )}

        {picked ? (
          <div className="rounded-lg border border-line bg-paper/50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-light text-slate">
                <FileAudio size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg" title={picked.name}>
                  {picked.name}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {formatFileSize(picked.file.size)}
                  {picked.durationSeconds ? ` · ${formatPlayerTime(picked.durationSeconds)}` : ""}
                </p>
              </div>
              {!uploading && (
                <button
                  type="button"
                  onClick={clearPicked}
                  aria-label="Remove file"
                  className="rounded-md p-1.5 text-ink-soft hover:bg-paper hover:text-fg"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {progress !== null && (
              <div className="mt-4">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-line"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div className="h-full rounded-full bg-slate transition-[width] duration-200" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-ink-soft">
                  {progress >= 100 ? "Processing…" : `Uploading… ${progress}%`}
                </p>
              </div>
            )}
          </div>
        ) : mode === "upload" ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={handleZoneKey}
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
            className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-9 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate ${
              dragging ? "border-slate bg-slate-light" : "border-line bg-paper/50 hover:border-slate/60 hover:bg-paper"
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-light text-slate">
              <UploadCloud size={20} />
            </span>
            <p className="mt-3 text-sm font-medium text-fg">
              {dragging ? "Drop the recording here" : "Drag a recording here, or click to choose"}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {RECORDING_FORMATS_LABEL} · up to {MAX_RECORDING_MB} MB
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-lg border border-line bg-paper/50 px-6 py-8 text-center">
            <p className="text-3xl font-medium tabular-nums text-fg" aria-live="off">
              {formatPlayerTime(recorder.elapsed)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
              {recording && <span className="h-2 w-2 animate-pulse rounded-full bg-danger" aria-hidden="true" />}
              {recording ? "Recording… speak near the microphone" : requesting ? "Waiting for microphone access…" : "Records from this device's microphone"}
            </p>
            <button
              type="button"
              onClick={() => (recording ? recorder.stop() : void recorder.start())}
              disabled={requesting || !recorder.supported}
              className={`mt-4 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
                recording ? "bg-danger text-white hover:opacity-90" : "bg-ink text-white hover:bg-ink-2"
              }`}
            >
              {recording ? <Square size={14} fill="currentColor" /> : <Mic size={15} />}
              {recording ? "Stop recording" : "Start recording"}
            </button>
            {!recorder.supported && (
              <p className="mt-2 text-xs text-ink-soft">This browser can&apos;t record audio. Upload a file instead.</p>
            )}
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

        {disabledNew && (
          <p className="text-xs text-danger">This call already has the maximum number of recordings. Delete one to add another.</p>
        )}

        {(error || recorder.error) && (
          <p className="flex items-start gap-1.5 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error ?? recorder.error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-line px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={!picked || uploading || disabledNew || recording}
          className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
        >
          {uploading && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {uploading ? "Uploading…" : "Upload recording"}
        </button>
      </div>
    </div>
  );
}
