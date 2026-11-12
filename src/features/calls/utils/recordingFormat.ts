import {
  MAX_RECORDING_BYTES,
  MAX_RECORDING_MB,
  RECORDING_EXTENSIONS,
} from "@/features/calls/types/callRecording.types";

/** "1.4 MB" / "312 KB" — same rounding as the backend's timeline messages. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "3:05" / "1:03:05" — the player clock. */
export function formatPlayerTime(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${ss}` : `${minutes}:${ss}`;
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** `accept` attribute of the file chooser. */
export const RECORDING_ACCEPT = ["audio/*", ...RECORDING_EXTENSIONS.map((ext) => `.${ext}`)].join(",");

/** Human list of the supported formats, for helper text. */
export const RECORDING_FORMATS_LABEL = RECORDING_EXTENSIONS.filter((ext) => !["oga", "mp4", "3gp"].includes(ext))
  .map((ext) => ext.toUpperCase())
  .join(", ");

/**
 * Client-side pre-check so an obviously wrong file never starts uploading.
 * Returns a message, or null when the file looks fine. The backend validates
 * again and stays the authority.
 */
export function validateRecordingFile(file: File | Blob, fileName: string): string | null {
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_RECORDING_BYTES) {
    return `This recording is ${formatFileSize(file.size)}. The limit is ${MAX_RECORDING_MB} MB.`;
  }
  const ext = fileExtension(fileName);
  const looksLikeAudio = file.type.startsWith("audio/") || file.type === "video/mp4" || file.type === "video/webm";
  const knownExtension = (RECORDING_EXTENSIONS as readonly string[]).includes(ext);
  if (!looksLikeAudio && !knownExtension) {
    return "Only audio files are accepted (MP3, M4A, WAV, OGG, WebM, AAC, FLAC, AMR…).";
  }
  return null;
}

/** Reads the length of an audio file in the browser; null when it can't be read. */
export function readAudioDuration(file: File | Blob): Promise<number | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 4000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : null);
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

/** Timestamped default name for a recording made in the browser. */
export function browserRecordingName(mimeType: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
  return `call-recording-${stamp}.${ext}`;
}
