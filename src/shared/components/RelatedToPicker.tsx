"use client";

import { useEffect, useState } from "react";
import RecordPicker, { type RecordPickerOption } from "@/shared/components/RecordPicker";
import { LeadService } from "@/features/leads/services/LeadService";
import { ContactService } from "@/features/contacts/services/ContactService";
import { AccountService } from "@/features/accounts/services/AccountService";

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
  const [personOptions, setPersonOptions] = useState<RecordPickerOption[]>([]);
  const [accountOptions, setAccountOptions] = useState<RecordPickerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      LeadService.getLeads().then((rows) => rows.map((row) => ({
        id: `lead:${row.id}`,
        label: row.name || row.company_name || "Unnamed Lead",
        sublabel: row.company_name || row.email || undefined,
      }))),
      ContactService.getContacts().then((rows) => rows.map((row) => ({
        id: `contact:${row.id}`,
        label: row.name || "Unnamed Contact",
        sublabel: row.email || row.account_name || undefined,
      }))),
      AccountService.getAccounts().then((rows) => rows.map((row) => ({
        id: row.id,
        label: row.account_name || "Unnamed Account",
        sublabel: row.website || row.phone || undefined,
      }))),
    ])
      .then(([leads, contacts, accounts]) => {
        if (cancelled) return;
        setPersonOptions([
          ...leads.map((row) => ({ ...row, label: `Lead: ${row.label}` })),
          ...contacts.map((row) => ({ ...row, label: `Contact: ${row.label}` })),
        ]);
        setAccountOptions(accounts);
      })
      .catch(() => {
        if (!cancelled) {
          setPersonOptions([]);
          setAccountOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-line bg-paper/40 p-4 sm:grid-cols-2">
      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">Contact / Lead</p>
        <RecordPicker
          options={personOptions}
          value={value.personId ? `${value.personType}:${value.personId}` : ""}
          label={value.personLabel}
          onChange={(id, label) => {
            const [type, rawId] = id.split(":");
            onChange({ ...value, personType: type === "lead" || type === "contact" ? type : "", personId: rawId || "", personLabel: label });
          }}
          placeholder={isLoading ? "Loading…" : "Select a contact or lead…"}
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-fg">Account</p>
        <RecordPicker
          options={accountOptions}
          value={value.accountId}
          label={value.accountLabel}
          onChange={(id, label) => onChange({ ...value, accountId: id, accountLabel: label })}
          placeholder={isLoading ? "Loading…" : "Select an account…"}
        />
      </div>
    </div>
  );
}
