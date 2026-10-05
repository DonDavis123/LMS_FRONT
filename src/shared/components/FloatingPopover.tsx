"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface FloatingPopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  width: number;
  ariaLabel: string;
  /** Raise above other portaled layers (e.g. the filter popover at z-100). */
  zIndex?: number;
  children: ReactNode;
}

interface Position {
  top: number;
  left: number;
  width: number;
  above: boolean;
}

/**
 * Viewport-aware popover used by the date and time pickers. It is portaled
 * to <body> so it is never clipped by a Modal's overflow, is clamped inside
 * the viewport (mobile safe), flips above the field when there is no room
 * below, and closes on outside click or Escape.
 */
export default function FloatingPopover({ anchorRef, onClose, width, ariaLabel, zIndex = 65, children }: FloatingPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    function place(event?: Event) {
      // Inner scrolling (e.g. the time wheels) must not trigger repositioning.
      if (event?.target instanceof Node && popoverRef.current?.contains(event.target)) return;

      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) return;

      const margin = 8;
      const gap = 6;
      const rect = anchor.getBoundingClientRect();
      const height = popover.offsetHeight;
      const effectiveWidth = Math.min(width, window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - effectiveWidth - margin));
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < height + gap + margin && rect.top > spaceBelow;
      const rawTop = above ? rect.top - height - gap : rect.bottom + gap;
      const top = Math.max(margin, Math.min(rawTop, window.innerHeight - height - margin));

      setPosition((prev) =>
        prev && prev.top === top && prev.left === left && prev.width === effectiveWidth && prev.above === above
          ? prev
          : { top, left, width: effectiveWidth, above }
      );
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, width]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Capture phase + stopPropagation so an enclosing Modal doesn't also close.
      event.stopPropagation();
      onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [anchorRef, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={ariaLabel}
      data-floating-popover=""
      style={{
        zIndex,
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: position?.width ?? width,
        transformOrigin: position?.above ? "bottom left" : "top left",
        visibility: position ? "visible" : "hidden",
      }}
      className={`rounded-2xl border border-line bg-surface p-4 shadow-2xl ${
        position ? (position.above ? "animate-popover-up" : "animate-popover-down") : ""
      }`}
    >
      {children}
    </div>,
    document.body
  );
}
