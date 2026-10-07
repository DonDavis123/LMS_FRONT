"use client";

import { useEffect, useState } from "react";

/**
 * Index of the quote to show. Advances every `intervalMs` while `active`;
 * stops while `active` is false (reduced motion, hover/focus) or the tab is
 * hidden, and restarts the full interval when it resumes.
 */
export function useQuoteRotation(
  count: number,
  intervalMs: number,
  active: boolean
): number {
  const [index, setIndex] = useState(0);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!active || !tabVisible || count < 2) return;
    const timer = window.setTimeout(
      () => setIndex((i) => (i + 1) % count),
      intervalMs
    );
    return () => window.clearTimeout(timer);
  }, [active, tabVisible, count, intervalMs, index]);

  return index;
}
