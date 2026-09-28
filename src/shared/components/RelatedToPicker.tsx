"use client";

import RecordPicker from "@/shared/components/RecordPicker";

export type RelatedPersonType = "lead" | "contact" | "";

/**
 * Zoho-style activity relationship: one person record (Lead or Contact)
 * plus an optional Account can be selected at the same time.
 */
export interface RelatedToValue {
  personType: RelatedPersonType;
  personId: string;
  personLabel: string;
  accountId: string;
  accountLabel: string;
}

interface RelatedToPickerProps {
  value: RelatedToValue;
  onChange: (value: RelatedToValue) => void;
}

export function emptyRelatedTo(): RelatedToValue {
  return { personType: "", personId: "", personLabel: "", accountId: "", accountLabel: "" };
}

export default function RelatedToPicker({ value, onChange }: RelatedToPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-line bg-paper/40 p-4 sm:grid-cols-2">
      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">Contact / Lead</p>
        <RecordPicker
          kinds={["lead", "contact"]}
          value={value.personId}
          valueKind={value.personType}
          label={value.personLabel}
          onChange={(id, label, kind) =>
            onChange({
              ...value,
              personType: id && (kind === "lead" || kind === "contact") ? kind : "",
              personId: id,
              personLabel: label,
            })
          }
          placeholder="Select a contact or lead…"
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">Account</p>
        <RecordPicker
          kind="account"
          value={value.accountId}
          label={value.accountLabel}
          onChange={(id, label) => onChange({ ...value, accountId: id, accountLabel: label })}
          placeholder="Select an account…"
        />
      </div>
    </div>
  );
}
