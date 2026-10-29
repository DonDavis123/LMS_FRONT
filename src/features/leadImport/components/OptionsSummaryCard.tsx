"use client";

import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import { DATA_CARD_ID } from "@/features/leadImport/components/DataHandlingCard";
import { DUPLICATE_CARD_ID } from "@/features/leadImport/components/DuplicateActionCard";
import { OWNER_CARD_ID } from "@/features/leadImport/components/OwnerPlanCard";
import type { ImportOptions } from "@/features/leadImport/types/leadImport.types";
import {
  convertedSentence,
  duplicateSentence,
  ownerLine,
  phoneSentence,
  unknownValuesSentence,
} from "@/features/leadImport/utils/optionSummary";

interface OptionsSummaryCardProps {
  options: ImportOptions;
  owners: LeadOwnerOption[] | null;
  totalRows: number;
  hasConvertedColumn: boolean;
  onEdit: (cardId: string) => void;
}

/** The current choices in plain sentences, each with a link back to its card. */
export default function OptionsSummaryCard({ options, owners, totalRows, hasConvertedColumn, onEdit }: OptionsSummaryCardProps) {
  const items: Array<{ key: string; label: string; text: string; target: string }> = [
    { key: "owner", label: "Owner", text: `${ownerLine(options, owners, totalRows)}.`, target: OWNER_CARD_ID },
    { key: "duplicates", label: "Duplicates", text: duplicateSentence(options), target: DUPLICATE_CARD_ID },
  ];
  if (hasConvertedColumn) {
    items.push({ key: "converted", label: "Converted rows", text: convertedSentence(options), target: DATA_CARD_ID });
  }
  items.push(
    { key: "phones", label: "Phone numbers", text: phoneSentence(options), target: DATA_CARD_ID },
    { key: "unknown", label: "Unknown dropdown values", text: unknownValuesSentence(options), target: DATA_CARD_ID },
  );

  return (
    <aside
      aria-labelledby="import-options-summary-title"
      className="rounded-lg border border-line bg-surface p-3 sm:p-4 lg:sticky lg:top-2"
    >
      <h3 id="import-options-summary-title" className="text-sm font-semibold text-fg">
        Summary of your choices
      </h3>
      <p className="text-xs text-ink-soft">Check that this is what you want before the file is checked.</p>

      <ul className="mt-3 divide-y divide-line" aria-live="polite">
        {items.map((item) => (
          <li key={item.key} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{item.label}</p>
              <button
                type="button"
                onClick={() => onEdit(item.target)}
                aria-label={`Edit ${item.label.toLowerCase()}`}
                className="rounded text-xs font-semibold text-slate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
              >
                Edit
              </button>
            </div>
            <p className="mt-0.5 break-words text-sm text-fg">{item.text}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
