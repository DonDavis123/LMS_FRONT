"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. Server snapshot is `false`, so the first
 * client render matches SSR; pages using this are client-only behind the
 * auth gate, so there is no visible mismatch.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
