"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface CurtainPanelProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  /** Panel is at least as wide as its anchor; this raises the floor. */
  minWidth?: number;
  className?: string;
  ariaLabel?: string;
}

interface Position {
  /** Distance from the viewport top (below) or bottom (above). */
  edge: number;
  left: number;
  width: number;
  above: boolean;
  /** Tallest the panel can be without leaving the viewport. */
  maxHeight: number;
}

// Roughly the panel's height with a full page of results; used to pick a
// side once, up front, so the panel never changes side as results change.
const EXPECTED_HEIGHT = 380;

const EXIT_MS = 170;

/**
 * Dropdown surface that unrolls like a curtain (see `.curtain-panel` in
 * globals.css). Portaled to <body> so a Modal's overflow never clips it,
 * flips above the field when there is no room below, stays inside the
 * viewport, and plays a short "lift" animation before unmounting.
 */
export default function CurtainPanel({
  open,
  anchorRef,
  onClose,
  children,
  minWidth = 0,
  className = "",
  ariaLabel,
}: CurtainPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  // Keeps the last side so the exit animation runs in the same direction.
  const side = position?.above ? "above" : "below";

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      setPosition(null);
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The side (above / below the field) is chosen ONCE when the panel opens,
  // using its full expected height. Re-deciding on every resize made a short
  // result list (1–2 rows) jump from above the field to below it.
  const sideRef = useRef<"above" | "below" | null>(null);
  useEffect(() => {
    if (!open) sideRef.current = null;
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted) return;

    function place() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const margin = 8;
      const gap = 4;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
      const spaceBelow = window.innerHeight - rect.bottom - margin - gap;
      const spaceAbove = rect.top - margin - gap;

      if (sideRef.current === null) {
        sideRef.current = spaceBelow < EXPECTED_HEIGHT && spaceAbove > spaceBelow ? "above" : "below";
      }
      const above = sideRef.current === "above";
      const maxHeight = Math.max(160, above ? spaceAbove : spaceBelow);
      // Anchor the edge that touches the field, so the panel grows/shrinks
      // away from the field instead of sliding around.
      const edge = above ? window.innerHeight - rect.top + gap : rect.bottom + gap;

      setPosition((prev) =>
        prev &&
        prev.edge === edge &&
        prev.left === left &&
        prev.width === width &&
        prev.above === above &&
        prev.maxHeight === maxHeight
          ? prev
          : { edge, left, width, above, maxHeight }
      );
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [mounted, anchorRef, minWidth]);

  // Field's rectangle, used to keep the field itself sharp inside the blur.
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!mounted) return;
    function measure() {
      setAnchorRect(anchorRef.current?.getBoundingClientRect() ?? null);
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [mounted, anchorRef]);

  // The panel stays visibility:hidden until it has been positioned, and a
  // hidden element can't take focus — so focus the search input (marked with
  // data-autofocus) only once the panel is actually visible.
  const focusedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      focusedRef.current = false;
      return;
    }
    if (!position || focusedRef.current) return;
    focusedRef.current = true;
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
  }, [open, position]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Capture phase so an enclosing Modal doesn't also close.
      event.stopPropagation();
      onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, anchorRef, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  // Full-screen blur with a rounded "hole" over the field, so the page
  // behind is softened while the field being edited stays crisp.
  const pad = 3;
  const hole =
    anchorRect && viewport.w
      ? (() => {
          const x = Math.max(0, anchorRect.left - pad);
          const y = Math.max(0, anchorRect.top - pad);
          const w = anchorRect.width + pad * 2;
          const h = anchorRect.height + pad * 2;
          const r = 8;
          return (
            `path(evenodd, 'M0 0H${viewport.w}V${viewport.h}H0Z ` +
            `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
            `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
            `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z')`
          );
        })()
      : undefined;

  return createPortal(
    <>
      <div
        aria-hidden
        data-state={closing ? "closing" : "open"}
        className="curtain-backdrop fixed inset-0 z-[85] bg-ink/20 backdrop-blur-[3px]"
        style={hole ? { clipPath: hole } : undefined}
        onMouseDown={(event) => {
          // Clicking the blurred page only dismisses the dropdown; it must
          // not also activate whatever is underneath.
          event.preventDefault();
          event.stopPropagation();
          if (open) onClose();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label={ariaLabel}
        data-state={closing ? "closing" : "open"}
        data-side={side}
        style={{
          position: "fixed",
          ...(position?.above ? { bottom: position.edge } : { top: position?.edge ?? 0 }),
          left: position?.left ?? 0,
          width: position?.width ?? Math.max(minWidth, 240),
          ...(position ? ({ "--curtain-max": `${position.maxHeight}px` } as React.CSSProperties) : {}),
          visibility: position ? "visible" : "hidden",
          pointerEvents: closing ? "none" : undefined,
        }}
        className={`curtain-panel z-[90] ${className}`}
      >
        {children}
      </div>
    </>,
    document.body
  );
}
