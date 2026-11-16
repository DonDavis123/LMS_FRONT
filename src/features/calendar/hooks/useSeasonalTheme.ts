"use client";

import { useCallback, useEffect, useState } from "react";
import { getThemeForMonth, type SeasonalTheme } from "@/features/calendar/config/seasonalThemes";

const STORAGE_KEY = "crm.calendar.seasonalTheme";

/**
 * Seasonal theme for the viewed month, plus the user's on/off choice.
 *
 * The choice is remembered in this browser ("off" is stored; anything else
 * means on). It starts "on" so the first server and client render match, then
 * reads the saved choice after mount. If storage is blocked the toggle still
 * works for the current page view.
 */
export function useSeasonalTheme(viewedMonth: number): {
  theme: SeasonalTheme | null;
  enabled: boolean;
  toggle: () => void;
} {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "off") setEnabled(false);
    } catch {
      // Storage unavailable — keep the default.
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      } catch {
        // Not persisted, still applied for this visit.
      }
      return next;
    });
  }, []);

  return { theme: enabled ? getThemeForMonth(viewedMonth) : null, enabled, toggle };
}
