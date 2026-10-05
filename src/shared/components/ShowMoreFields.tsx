"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface ShowMoreFieldsProps {
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Label while collapsed. */
  moreLabel?: string;
  /** Label while expanded. */
  lessLabel?: string;
  /** Id used to link the button to the panel (aria-controls). */
  id?: string;
}

/**
 * Presentation-only progressive disclosure: a toggle button plus an
 * animated panel. The parent owns `expanded` (and all form state), so
 * fields inside keep their values whether the panel is open or closed.
 * Collapsed content is `inert` — it can't be focused or read by assistive
 * tech until it's opened.
 */
export default function ShowMoreFields({
  expanded,
  onToggle,
  children,
  moreLabel = "Show more fields",
  lessLabel = "Show fewer fields",
  id = "more-fields",
}: ShowMoreFieldsProps) {
  // Popovers inside the panel (pickers, calendar) need `overflow: visible`,
  // but only once the open animation has finished.
  const [settled, setSettled] = useState(expanded);

  useEffect(() => {
    if (!expanded) {
      setSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), 380);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={id}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line px-4 py-2.5 text-sm font-semibold text-slate transition hover:border-slate hover:bg-paper active:scale-[0.99]"
      >
        {expanded ? lessLabel : moreLabel}
        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={id}
        className="lp-reveal"
        data-open={expanded}
        data-settled={settled}
        inert={!expanded}
      >
        <div className="lp-reveal-inner">{children}</div>
      </div>
    </>
  );
}
