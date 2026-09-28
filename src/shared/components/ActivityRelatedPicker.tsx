"use client";

import { useEffect, useState } from "react";
import RecordPicker from "@/shared/components/RecordPicker";
import RelatedTypeSelect from "@/shared/components/RelatedTypeSelect";
import type { RelatedToValue, RelatedPersonType } from "@/shared/components/RelatedToPicker";

type RelatedType = "" | "lead" | "contact" | "account";

const EMPTY: RelatedToValue = { personType: "", personId: "", personLabel: "", accountId: "", accountLabel: "" };

export default function ActivityRelatedPicker({ value, onChange, includeAccount = true, pickerMenuClassName }: { value: RelatedToValue; onChange: (value: RelatedToValue) => void; includeAccount?: boolean; pickerMenuClassName?: string }) {
  const [type, setType] = useState<RelatedType>(value.personType || (includeAccount && value.accountId ? "account" : ""));

  useEffect(() => {
    if (includeAccount || type !== "account") return;
    setType("");
    onChange(EMPTY);
  }, [includeAccount, type, onChange]);

  const selectedId = type === "account" ? value.accountId : value.personId;
  const selectedLabel = type === "account" ? value.accountLabel : value.personLabel;

  const typeOptions: readonly (readonly [RelatedType, string])[] = [
    ["", "None"],
    ["lead", "Lead"],
    ["contact", "Contact"],
    ...(includeAccount ? ([["account", "Account"]] as const) : []),
  ];

  function choose(next: RelatedType) {
    setType(next);
    onChange({ ...EMPTY, personType: (next === "lead" || next === "contact" ? next : "") as RelatedPersonType });
  }

  return (
    <div className="grid grid-cols-[125px_1fr] items-center gap-4 border-b border-line/80 py-1.5">
      <label className="text-sm text-ink-soft">Related To</label>
      <div>
        <RelatedTypeSelect value={type} onChange={choose} options={typeOptions} />
        {type && (
          <div className="mt-1">
            <RecordPicker
              key={type}
              kind={type}
              variant="underline"
              value={selectedId}
              label={selectedLabel}
              onChange={(id, label) => {
                if (type === "account") onChange({ ...EMPTY, accountId: id, accountLabel: label });
                else onChange({ ...EMPTY, personType: id ? type : "", personId: id, personLabel: label });
              }}
              placeholder={`Search ${type}…`}
              menuClassName={pickerMenuClassName}
            />
          </div>
        )}
      </div>
    </div>
  );
}
