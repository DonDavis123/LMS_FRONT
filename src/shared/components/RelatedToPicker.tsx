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
  /**
   * Accounts can only be linked to a contact. When set, picking a lead clears
   * the account and disables the account field until a contact is chosen.
   */
  disableAccountForLead?: boolean;
}

export function emptyRelatedTo(): RelatedToValue {
  return { personType: "", personId: "", personLabel: "", accountId: "", accountLabel: "" };
}

export default function RelatedToPicker({ value, onChange, disableAccountForLead = false }: RelatedToPickerProps) {
  const accountLocked = disableAccountForLead && value.personType === "lead";

  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-line bg-paper/40 p-4 sm:grid-cols-2">
      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">Contact / Lead</p>
        <RecordPicker
          kinds={["lead", "contact"]}
          value={value.personId}
          valueKind={value.personType}
          label={value.personLabel}
          onChange={(id, label, kind) => {
            const personType: RelatedPersonType = id && (kind === "lead" || kind === "contact") ? kind : "";
            const clearAccount = disableAccountForLead && personType === "lead";
            onChange({
              ...value,
              personType,
              personId: id,
              personLabel: label,
              ...(clearAccount ? { accountId: "", accountLabel: "" } : {}),
            });
          }}
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
          placeholder={accountLocked ? "Not available for leads" : "Select an account…"}
          disabled={accountLocked}
        />
        {accountLocked && (
          <span className="mt-1.5 block text-xs text-ink-soft">Accounts can only be linked to a call with a contact.</span>
        )}
      </div>
    </div>
  );
}
