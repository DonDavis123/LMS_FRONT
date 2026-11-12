"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import Modal from "@/shared/components/Modal";
import Spinner from "@/shared/components/Spinner";
import RecordingPicker from "@/features/calls/components/RecordingPicker";
import { CallRecordingService } from "@/features/calls/services/CallRecordingService";
import type { CallRecording, PendingRecording } from "@/features/calls/types/callRecording.types";
import { extractApiError } from "@/shared/utils/apiError";

interface RecordingUploadDialogProps {
  isOpen: boolean;
  callId: string;
  /** How many more recordings this call can still take. */
  slotsLeft: number;
  onClose: () => void;
  onUploaded: (recording: CallRecording) => void;
}

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
  const [picked, setPicked] = useState<PendingRecording | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel an upload still in flight if the dialog is closed.
  useEffect(() => () => abortRef.current?.abort(), []);

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

  const full = slotsLeft <= 0;

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
        <RecordingPicker value={picked} onChange={setPicked} disabled={uploading} />

        {progress !== null && (
          <div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-full rounded-full bg-slate transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">{progress >= 100 ? "Processing…" : `Uploading… ${progress}%`}</p>
          </div>
        )}

        {full && (
          <p className="text-xs text-danger">This call already has the maximum number of recordings. Delete one to add another.</p>
        )}

        {error && (
          <p className="flex items-start gap-1.5 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
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
          disabled={!picked || uploading || full}
          className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-60"
        >
          {uploading && <Spinner size="sm" className="border-white/30 border-t-white" />}
          {uploading ? "Uploading…" : "Upload recording"}
        </button>
      </div>
    </div>
  );
}
