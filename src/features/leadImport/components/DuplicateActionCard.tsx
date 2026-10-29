"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import ShowMoreFields from "@/shared/components/ShowMoreFields";
import OptionRadioGroup from "@/features/leadImport/components/OptionRadioCard";
import type { DuplicateAction } from "@/features/leadImport/types/leadImport.types";

export const DUPLICATE_CARD_ID = "import-options-duplicates";

interface DuplicateActionCardProps {
  value: DuplicateAction;
  onChange: (action: DuplicateAction) => void;
}

const RULES = [
  "A row with an email is matched on email only.",
  "A row without an email is matched on phone or mobile only (the last 10 digits, at least 7 digits).",
  "Names and company names are never used to find a duplicate.",
  "Rows that repeat inside your file are found too. The first one is kept.",
];

/** Card 2: what happens to a row that matches a lead that already exists. */
export default function DuplicateActionCard({ value, onChange }: DuplicateActionCardProps) {
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <section id={DUPLICATE_CARD_ID} tabIndex={-1} aria-labelledby="import-options-duplicates-title" className="scroll-mt-4 rounded-lg border border-line bg-surface p-3 outline-none sm:p-4">
      <h3 id="import-options-duplicates-title" className="text-sm font-semibold text-fg">
        If a lead already exists
      </h3>
      <p className="text-xs text-ink-soft">This one choice applies to the whole file.</p>

      <div className="mt-3">
        <OptionRadioGroup<DuplicateAction>
          ariaLabel="If a lead already exists"
          value={value}
          onChange={onChange}
          options={[
            {
              value: "skip",
              label: "Skip it",
              description: "Leave the existing lead as it is and do not add the row.",
              badge: "Recommended",
            },
            {
              value: "update",
              label: "Update the existing lead",
              description: "Fill the existing lead with the details from your file.",
              note: (
                <span className="flex items-start gap-1.5 rounded-md bg-paper px-2.5 py-1.5 text-xs text-ink-soft">
                  <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Only filled-in cells are used. Nothing is erased. Converted leads are never changed.
                </span>
              ),
            },
            {
              value: "create_anyway",
              label: "Add it anyway",
              description: "Add every row as a new lead, even if it looks like a duplicate.",
              note: (
                <span className="flex items-start gap-1.5 rounded-md border border-amber/40 bg-amber/10 px-2.5 py-1.5 text-xs text-fg">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-dark" aria-hidden="true" />
                  This can create duplicate leads. You can undo the import later.
                </span>
              ),
            },
          ]}
        />
      </div>

      <ShowMoreFields
        id="import-duplicate-rules"
        expanded={rulesOpen}
        onToggle={() => setRulesOpen((open) => !open)}
        moreLabel="How duplicates are found"
        lessLabel="Hide how duplicates are found"
      >
        <ul className="space-y-1.5 pt-3 text-sm text-fg">
          {RULES.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-soft" />
              <span className="min-w-0">{rule}</span>
            </li>
          ))}
        </ul>
      </ShowMoreFields>
    </section>
  );
}
