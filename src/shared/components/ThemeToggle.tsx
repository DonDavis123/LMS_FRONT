"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "crm.theme";
const REVEAL_MS = 650;

type Theme = "light" | "dark";

type ViewTransitionLike = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type DocumentWithTransitions = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionLike;
};

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isSwitchingRef = useRef(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  function commit(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  function toggle() {
    if (isSwitchingRef.current) return;
    const next: Theme = theme === "dark" ? "light" : "dark";
    const doc = document as DocumentWithTransitions;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // No View Transitions support (older Firefox/Safari) or reduced motion:
    // switch immediately — the global colour transitions still soften it.
    if (!doc.startViewTransition || prefersReducedMotion || !buttonRef.current) {
      commit(next);
      return;
    }

    // Dark: the new (dark) theme grows outward from the centre of the button.
    // Light: the reverse — the old (dark) theme shrinks back into the button,
    // revealing the light theme underneath.
    const reverse = next === "light";
    const rect = buttonRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const root = document.documentElement;
    isSwitchingRef.current = true;
    root.classList.add("theme-switching");
    if (reverse) root.classList.add("theme-reverse");

    const transition = doc.startViewTransition(() => {
      // flushSync makes React render the new icon/state inside the
      // snapshot window instead of a frame later.
      flushSync(() => commit(next));
    });

    transition.ready
      .then(() => {
        const full = `circle(${radius}px at ${x}px ${y}px)`;
        const none = `circle(0px at ${x}px ${y}px)`;
        root.animate(
          { clipPath: reverse ? [full, none] : [none, full] },
          {
            duration: REVEAL_MS,
            easing: reverse ? "cubic-bezier(0.65, 0, 0.35, 1)" : "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
            pseudoElement: reverse ? "::view-transition-old(root)" : "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {
        /* transition skipped — the theme is already applied */
      });

    transition.finished.finally(() => {
      root.classList.remove("theme-switching", "theme-reverse");
      isSwitchingRef.current = false;
    });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md text-ink-soft hover:bg-paper hover:text-fg active:scale-90"
    >
      {/* Re-keyed per theme so the incoming icon plays its turn-in animation. */}
      <span key={theme} className="animate-theme-icon flex">
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  );
}
