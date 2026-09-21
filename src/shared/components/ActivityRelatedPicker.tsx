"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { LeadService } from "@/features/leads/services/LeadService";
import { ContactService } from "@/features/contacts/services/ContactService";
import { AccountService } from "@/features/accounts/services/AccountService";
import RecordPicker, { type RecordPickerOption } from "@/shared/components/RecordPicker";
import type { RelatedToValue, RelatedPersonType } from "@/shared/components/RelatedToPicker";

type RelatedType = "" | "lead" | "contact" | "account";

export default function ActivityRelatedPicker({ value, onChange }: { value: RelatedToValue; onChange: (value: RelatedToValue) => void }) {
  const [options, setOptions] = useState<RecordPickerOption[]>([]);
  const [type, setType] = useState<RelatedType>(value.personType || (value.accountId ? "account" : ""));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([LeadService.getLeads(), ContactService.getContacts(), AccountService.getAccounts()])
      .then(([leads, contacts, accounts]) => {
        if (cancelled) return;
        setOptions([
          ...leads.map((row) => ({ id: `lead:${row.id}`, label: row.name || row.company_name || "Unnamed Lead", sublabel: row.company_name || row.email || undefined })),
          ...contacts.map((row) => ({ id: `contact:${row.id}`, label: row.name || "Unnamed Contact", sublabel: row.email || row.account_name || undefined })),
          ...accounts.map((row) => ({ id: `account:${row.id}`, label: row.account_name || "Unnamed Account", sublabel: row.website || row.phone || undefined })),
        ]);
      })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const label = type === "lead" ? "Lead" : type === "contact" ? "Contact" : type === "account" ? "Others" : "None";
  const selectedId = type === "account" ? value.accountId : value.personId;
  const selectedLabel = type === "account" ? value.accountLabel : value.personLabel;
  const filtered = type ? options.filter((option) => option.id.startsWith(`${type}:`)) : [];

  function choose(next: RelatedType) {
    setType(next);
    onChange({ personType: (next === "lead" || next === "contact" ? next : "") as RelatedPersonType, personId: "", personLabel: "", accountId: "", accountLabel: "" });
    setOpen(false);
  }

  return (
    <div className="grid grid-cols-[125px_1fr] items-center gap-4 border-b border-line/80 py-1.5">
      <label className="text-sm text-ink-soft">Related To</label>
      <div>
        <div className="relative">
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between border-b border-line bg-transparent py-2 text-left text-sm">
            <span className={type ? "text-fg" : "text-ink-soft"}>{label}</span>
            <ChevronDown size={14} className="text-ink-soft" />
          </button>
          {open && (
            <div className="absolute left-0 top-full z-40 mt-1 w-36 overflow-hidden rounded-md border border-line bg-surface shadow-xl">
              {([["", "None"], ["lead", "Lead"], ["contact", "Contact"], ["account", "Others"]] as const).map(([valueType, valueLabel]) => (
                <button key={valueLabel} type="button" onClick={() => choose(valueType)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-paper">
                  <span className="w-3 text-slate">{label === valueLabel ? "✓" : ""}</span>{valueLabel}
                </button>
              ))}
            </div>
          )}
        </div>
        {type && (
          <div className="relative mt-1 flex items-center border-b border-line">
            <Search size={14} className="mr-2 shrink-0 text-ink-soft" />
            <RecordPicker
              options={filtered}
              value={selectedId}
              label={selectedLabel}
              onChange={(id, selected) => {
                const rawId = id.split(":")[1] || "";
                if (type === "account") onChange({ personType: "", personId: "", personLabel: "", accountId: rawId, accountLabel: selected });
                else onChange({ personType: type, personId: rawId, personLabel: selected, accountId: "", accountLabel: "" });
              }}
              placeholder={loading ? "Loading…" : `Search ${type === "account" ? "account" : type}…`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
