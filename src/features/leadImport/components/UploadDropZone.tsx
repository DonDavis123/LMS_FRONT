"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type RefObject } from "react";
import { acceptAttribute, readDroppedFiles, type DroppedFiles } from "@/features/leadImport/utils/fileChecks";
import { formatBytes, formatCount } from "@/features/leadImport/utils/format";
import type { ImportLimits } from "@/features/leadImport/types/leadImport.types";

interface UploadDropZoneProps {
  limits: ImportLimits;
  onFiles: (picked: DroppedFiles) => void;
  /** Lets the parent open the file chooser (for "Choose another file"). */
  inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}

export default function UploadDropZone({ limits, onFiles, inputRef, disabled = false }: UploadDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  // A file dropped just outside the zone would make the browser open it
  // and leave the page. Block that while this screen is showing.
  useEffect(() => {
    function block(event: globalThis.DragEvent) {
      if (event.dataTransfer?.types?.includes("Files")) event.preventDefault();
    }
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  function openChooser() {
    if (!disabled) inputRef.current?.click();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openChooser();
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    depth.current += 1;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = disabled ? "none" : "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (disabled) return;
    // Must be read now: the browser clears the drop data after this handler.
    onFiles(readDroppedFiles(event.dataTransfer));
  }

  const accept = acceptAttribute(limits);
  const readableLimits = `CSV or Excel (.xlsx), up to ${formatBytes(limits.max_bytes)} and ${formatCount(limits.max_rows)} rows`;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label="Choose a file to import, or drag one here"
      onClick={openChooser}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-amber ${
        dragging ? "border-amber bg-amber/10" : "border-line bg-surface hover:border-slate hover:bg-paper"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          dragging ? "bg-amber text-fg" : "bg-slate-light text-slate"
        }`}
      >
        <UploadCloud size={22} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-fg">
        {dragging ? "Drop the file to upload it" : "Drag a file here or choose one"}
      </p>
      <p className="text-xs text-ink-soft">{readableLimits}</p>
      <span className="mt-1 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg">
        Choose file
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          // Reset so choosing the same file again still fires a change.
          event.target.value = "";
          onFiles({ files: picked, folderCount: 0 });
        }}
      />
    </div>
  );
}
