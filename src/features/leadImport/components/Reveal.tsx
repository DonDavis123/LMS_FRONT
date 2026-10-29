"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Smooth height transition for a panel that opens and closes. Uses the app's
 * `lp-reveal` styles (same as ShowMoreFields). Closed content is `inert`, so
 * it cannot be tabbed to or read until it is open.
 */
export default function Reveal({ open, children, id }: { open: boolean; children: ReactNode; id?: string }) {
  // Pickers inside need `overflow: visible`, but only once the panel has finished opening.
  const [settled, setSettled] = useState(open);

  useEffect(() => {
    if (!open) {
      setSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), 380);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div id={id} className="lp-reveal" data-open={open} data-settled={settled} inert={!open}>
      <div className="lp-reveal-inner">{children}</div>
    </div>
  );
}
