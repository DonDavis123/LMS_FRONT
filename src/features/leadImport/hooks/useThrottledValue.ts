import { useEffect, useRef, useState } from "react";

/** Follows `value`, but changes at most once every `intervalMs`. The first change is shown at once. */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [shown, setShown] = useState(value);
  const lastShownAt = useRef(0);

  useEffect(() => {
    if (value === shown) return;
    const wait = Math.max(0, lastShownAt.current + intervalMs - Date.now());
    const timer = window.setTimeout(() => {
      lastShownAt.current = Date.now();
      setShown(value);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [value, shown, intervalMs]);

  return shown;
}
