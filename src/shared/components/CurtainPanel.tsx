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
  top: number;
  left: number;
  width: number;
  above: boolean;
}

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

  useLayoutEffect(() => {
    if (!mounted) return;

    function place() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const margin = 8;
      const gap = 4;
      const rect = anchor.getBoundingClientRect();
      const height = panel.offsetHeight;
      const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const above = spaceBelow < height + gap && spaceAbove > spaceBelow;
      const rawTop = above ? rect.top - height - gap : rect.bottom + gap;
      const top = Math.max(margin, Math.min(rawTop, window.innerHeight - height - margin));

      setPosition((prev) =>
        prev && prev.top === top && prev.left === left && prev.width === width && prev.above === above
          ? prev
          : { top, left, width, above }
      );
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    // Results arrive asynchronously and change the panel's height.
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (panelRef.current) observer?.observe(panelRef.current);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      observer?.disconnect();
    };
  }, [mounted, anchorRef, minWidth]);

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

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={ariaLabel}
      data-state={closing ? "closing" : "open"}
      data-side={side}
      style={{
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: position?.width ?? Math.max(minWidth, 240),
        visibility: position ? "visible" : "hidden",
        pointerEvents: closing ? "none" : undefined,
      }}
      className={`curtain-panel z-[90] ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}
