"use client";

import { useRef, useState } from "react";

/**
 * Shared tab switch for record-detail pages (Lead / Contact / Account /
 * Deal / Task / Meeting / Call) and the Dropdown Options module switcher.
 *
 * Renders as a pill-shaped segmented switch. A highlighted thumb glides
 * behind the active option with a light spring, and "stretches" from its
 * trailing edge while it travels so the move feels physical rather than
 * a plain slide. Options share one width, so the thumb position is pure
 * CSS (no measuring, no hydration flash).
 *
 * Interaction details:
 *  - hover tint on inactive options, press-down scale on click
 *  - roving tabindex + ArrowLeft/ArrowRight/Home/End keyboard support
 *  - visible focus ring (keyboard only)
 *  - all motion collapses under `prefers-reduced-motion` (see globals.css)
 *
 * Props are unchanged, so every existing usage picks this up as-is.
 */
export interface TabItem<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (value: T) => void;
}

export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === active),
  );

  // Track the previous index during render (React's "derive state from
  // props" pattern) so the thumb knows which way it moved and can replay
  // its stretch animation on every change - including changes that come
  // from outside the control (e.g. a `?tab=` link).
  const [prevIndex, setPrevIndex] = useState(activeIndex);
  const [pulse, setPulse] = useState(0);
  const [movingRight, setMovingRight] = useState(true);
  if (prevIndex !== activeIndex) {
    setMovingRight(activeIndex > prevIndex);
    setPrevIndex(activeIndex);
    setPulse((count) => count + 1);
  }

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let next = activeIndex;
    if (event.key === "ArrowRight") next = (activeIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (activeIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;

    event.preventDefault();
    onChange(tabs[next].value);
    buttonRefs.current[next]?.focus();
  }

  return (
    <div className="mt-6">
      <div
        role="tablist"
        onKeyDown={handleKeyDown}
        className="relative inline-grid grid-flow-col auto-cols-fr rounded-full border border-line bg-surface p-1 shadow-[inset_0_1px_2px_rgba(18,33,58,0.06)]"
      >
        {/* Sliding thumb: one option wide, moved by whole-width steps. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1 top-1 [transition:transform_460ms_cubic-bezier(0.3,1.15,0.5,1)]"
          style={{
            width: `calc((100% - 0.5rem) / ${tabs.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        >
          {/* Inner shape re-mounts on each change to replay the stretch. */}
          <span
            key={pulse}
            className={`block h-full w-full rounded-full border border-slate bg-slate-light shadow-[0_1px_2px_rgba(18,33,58,0.14),0_6px_12px_-6px_rgba(76,103,133,0.55)] ${
              pulse > 0 ? "animate-tab-thumb" : ""
            }`}
            style={{ transformOrigin: movingRight ? "right center" : "left center" }}
          />
        </span>

        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={tab.value}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.value)}
              className={`relative z-10 select-none rounded-full px-5 py-1.5 text-sm font-medium outline-none transition-[color,background-color,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-slate/60 active:scale-[0.95] ${
                isActive ? "text-fg" : "text-ink-soft hover:bg-slate/10 hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
