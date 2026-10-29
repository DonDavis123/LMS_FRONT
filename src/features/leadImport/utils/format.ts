const COUNT_FORMAT = new Intl.NumberFormat("en-US");

/** 10000 -> "10,000" */
export function formatCount(value: number): string {
  return COUNT_FORMAT.format(Number.isFinite(value) ? value : 0);
}

/** 1536 -> "1.5 KB", 10485760 -> "10 MB" */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 bytes";
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 || Number.isInteger(value) ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/** Seconds -> "under a second", "42 sec", "2 min 5 sec", "1 hr 3 min" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 1) return "under a second";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  if (minutes > 0) return secs > 0 ? `${minutes} min ${secs} sec` : `${minutes} min`;
  return `${secs} sec`;
}
