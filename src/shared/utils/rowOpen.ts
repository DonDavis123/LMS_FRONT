import type { KeyboardEvent, MouseEvent } from "react";

/** Elements inside a row that have their own click behaviour. */
const INTERACTIVE = "a, button, input, select, textarea, label, [role='button'], [role='menuitem'], [role='option']";

/**
 * Single click on a list row opens the record. Clicks on the row's own
 * controls (links, buttons, pickers), clicks inside portalled popovers, and
 * clicks that finish a text selection are ignored.
 */
export function openRowOnClick(event: MouseEvent<HTMLElement>, onOpen: () => void): void {
  const target = event.target as HTMLElement;
  if (!event.currentTarget.contains(target)) return; // React bubbles portal events
  if (target.closest(INTERACTIVE)) return;
  if (window.getSelection()?.toString()) return;
  onOpen();
}

/** Enter on a focused row opens it (rows are focusable via `tabIndex={0}`). */
export function openRowOnKey(event: KeyboardEvent<HTMLElement>, onOpen: () => void): void {
  if (event.key !== "Enter" || event.target !== event.currentTarget) return;
  event.preventDefault();
  onOpen();
}

/** Focus ring for keyboard users; mirrors the row hover accent. */
export const rowFocusClass =
  "outline-none focus-visible:bg-paper focus-visible:shadow-[inset_2px_0_0_var(--color-amber)]";
