"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drop-in replacement for `useState<string | null>(null)` for a form's
 * top-level error message.
 *
 * Whenever an error is set (even the same message twice in a row) the error
 * element is scrolled into view, so the user never has to scroll up to find
 * out why a submit was rejected. Works for full-page forms and for forms
 * inside a scrolling modal/curtain, because `scrollIntoView` scrolls every
 * scrollable ancestor.
 *
 * Usage:
 *   const [error, setError, errorRef] = useFormError();
 *   ...
 *   {error && <p ref={errorRef} ...>{error}</p>}
 */
export function useFormError() {
  const [error, setErrorState] = useState<string | null>(null);
  // Bumped on every non-null set so an identical repeated message still re-scrolls.
  const [tick, setTick] = useState(0);
  const errorRef = useRef<HTMLElement | null>(null);

  const setError = useCallback((message: string | null) => {
    setErrorState(message);
    if (message) setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!error) return;
    const el = errorRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }, [error, tick]);

  return [error, setError, errorRef] as const;
}
