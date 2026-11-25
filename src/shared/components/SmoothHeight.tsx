"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Animates its own height whenever its content changes size — a skeleton
 * being replaced by real content, a panel collapsing, text wrapping onto a
 * new line. Without it, late-arriving data makes everything below jump.
 *
 * The first measurement is applied without a transition (so nothing animates
 * on mount); every later size change glides. Overflow is clipped, so put
 * dropdowns inside it only if they are `position: fixed` or portalled.
 * Reduced-motion users get the near-instant transition from globals.css.
 */
export default function SmoothHeight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const node = innerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`overflow-hidden ${height === null ? "" : "transition-[height] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"} ${className}`}
      style={height === null ? undefined : { height }}
    >
      {/* flow-root keeps child margins inside the measured box. */}
      <div ref={innerRef} className="flow-root">
        {children}
      </div>
    </div>
  );
}
