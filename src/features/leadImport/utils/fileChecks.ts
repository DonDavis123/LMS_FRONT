import { formatBytes } from "@/features/leadImport/utils/format";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import type { ImportLimits } from "@/features/leadImport/types/leadImport.types";

function clientError(code: string, message: string, howToFix: string): ImportErrorInfo {
  return { message, howToFix, code, isNetwork: false, isCancelled: false };
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function normalizeExtension(value: string): string {
  const lower = value.trim().toLowerCase();
  return lower.startsWith(".") ? lower : `.${lower}`;
}

/** Builds the input's accept attribute from the allowed extensions: ".csv,.xlsx". */
export function acceptAttribute(limits: ImportLimits): string {
  return limits.allowed_extensions.map(normalizeExtension).join(",");
}

/**
 * Checks a chosen file before any request is sent. Returns the same error
 * shape as a server failure (same codes), or null when the file looks fine.
 * The server's own checks are still the truth.
 */
export function checkFileBeforeUpload(file: File, limits: ImportLimits): ImportErrorInfo | null {
  const extension = extensionOf(file.name);

  if (extension === ".xls") {
    return clientError(
      "unsupported_xls",
      "Excel 97-2003 files are not supported.",
      "Save it as .xlsx and try again.",
    );
  }

  const allowed = limits.allowed_extensions.map(normalizeExtension);
  if (!allowed.includes(extension)) {
    return clientError(
      "unsupported_file_type",
      "This type of file can't be imported.",
      "Choose a CSV (.csv) or Excel (.xlsx) file.",
    );
  }

  if (file.size === 0) {
    return clientError(
      "empty_file",
      "This file is empty.",
      "Choose a file that has a header row and at least one lead.",
    );
  }

  if (file.size > limits.max_bytes) {
    return clientError(
      "file_too_large",
      `This file is ${formatBytes(file.size)}, which is over the ${formatBytes(limits.max_bytes)} limit.`,
      "Remove unused columns or split the file into smaller files.",
    );
  }

  return null;
}

export const FOLDER_ERROR: ImportErrorInfo = clientError(
  "folder_not_allowed",
  "Folders can't be imported.",
  "Drag a single CSV or Excel (.xlsx) file instead.",
);

export interface DroppedFiles {
  files: File[];
  folderCount: number;
}

/**
 * Reads a drop event's files and counts folders, which are never accepted.
 * Must be called synchronously inside the drop handler.
 */
export function readDroppedFiles(transfer: DataTransfer): DroppedFiles {
  const files: File[] = [];
  let folderCount = 0;
  const items = Array.from(transfer.items ?? []);

  if (items.length > 0) {
    for (const item of items) {
      if (item.kind !== "file") continue;
      // Older browsers lack webkitGetAsEntry; then folders can't be told apart here.
      const entry = item.webkitGetAsEntry?.() ?? null;
      if (entry?.isDirectory) {
        folderCount += 1;
        continue;
      }
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    return { files, folderCount };
  }

  return { files: Array.from(transfer.files ?? []), folderCount: 0 };
}
