import { useCallback, useState } from "react";

/** The set of row numbers ticked in the review table. */
export function useRowSelection() {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const toggle = useCallback((row: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }, []);

  /** Ticks every row in `rows`, or unticks them all when they are all ticked already. */
  const toggleMany = useCallback((rows: number[]) => {
    setSelected((current) => {
      const next = new Set(current);
      const all = rows.length > 0 && rows.every((row) => next.has(row));
      for (const row of rows) {
        if (all) next.delete(row);
        else next.add(row);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected((current) => (current.size ? new Set() : current)), []);

  return { selected, toggle, toggleMany, clear };
}
