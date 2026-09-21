import { useEffect } from "react";

export function useSelectionKeyboard(
  enabled: boolean,
  selectedCount: number,
  onDelete: () => void,
) {
  useEffect(() => {
    if (!enabled || selectedCount === 0) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      void onDelete();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, selectedCount, onDelete]);
}
