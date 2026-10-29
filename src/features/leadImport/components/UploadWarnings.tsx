"use client";

import { Info } from "lucide-react";
import { useState } from "react";

const VISIBLE = 5;

/** A calm amber-tinted "Things to know" list for the upload's `warnings`. */
export default function UploadWarnings({ warnings }: { warnings: string[] }) {
  const [showAll, setShowAll] = useState(false);
  if (warnings.length === 0) return null;
  const shown = showAll ? warnings : warnings.slice(0, VISIBLE);
  const hidden = warnings.length - shown.length;

  return (
    <section className="rounded-lg border border-amber/40 bg-amber/10 p-4" aria-labelledby="import-warnings-title">
      <h3 id="import-warnings-title" className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Info size={15} className="text-amber-dark" aria-hidden="true" />
        Things to know
      </h3>
      <ul className="mt-2 space-y-1.5 text-sm text-fg">
        {shown.map((warning, index) => (
          <li key={`${index}-${warning}`} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-dark" />
            <span className="min-w-0 break-words">{warning}</span>
          </li>
        ))}
      </ul>
      {warnings.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-2 rounded text-sm font-semibold text-slate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          {showAll ? "Show fewer" : `Show ${hidden} more`}
        </button>
      )}
    </section>
  );
}
