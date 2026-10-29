/** Saves a Blob as a file through a temporary object URL (revoked afterwards). */
export function saveBlob(blob: Blob, fileName: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
