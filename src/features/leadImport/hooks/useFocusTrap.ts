import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab inside the dialog that contains `ref`, moves focus into it when it
 * opens and gives focus back to whatever had it before (the trigger) when it
 * closes. Mount it only while the dialog is open.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const start = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    start?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !start) return;
      const root = start.closest<HTMLElement>('[role="dialog"]') ?? start;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!(active instanceof Node) || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === start)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous && previous.isConnected) previous.focus();
    };
  }, [ref]);
}
