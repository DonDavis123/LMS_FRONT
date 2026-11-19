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
 * `setError` also takes a list of messages to show several errors at once.
 *
 * Usage:
 *   const [error, setError, errorRef] = useFormError();
 *   ...
 *   {error && <FormErrorMessage message={error} errorRef={errorRef} />}
 */
export function useFormError() {
  const [error, setErrorState] = useState<string | null>(null);
  // Bumped on every non-null set so an identical repeated message still re-scrolls.
  const [tick, setTick] = useState(0);
  const errorRef = useRef<HTMLElement | null>(null);

  // A list of messages is stored as one newline-separated string, which
  // `FormErrorMessage` renders as a list. A single message stays a plain string.
  const setError = useCallback((message: string | string[] | null) => {
    const value = Array.isArray(message) ? message.join("\n") || null : message;
    setErrorState(value);
    if (value) setTick((t) => t + 1);
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
